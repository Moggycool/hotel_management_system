import uuid
from decimal import Decimal
from django.db import IntegrityError, transaction
from django.utils import timezone
from django.shortcuts import get_object_or_404
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.accounts.models import StaffRole
from apps.accounts.permissions import IsFinanceStaff, IsFrontOfficeStaff
from apps.audit.mixins import AuditedModelViewSetMixin
from apps.audit.models import AuditModule
from apps.audit.services import log_audit_event
from apps.properties.models import Property

from .models import CashierShift, Folio, FolioItem, Payment
from .serializers import (
    CashierShiftSerializer,
    CloseCashierShiftSerializer,
    FolioSerializer,
    FolioItemSerializer,
    OpenCashierShiftSerializer,
    PaymentSerializer,
    TelebirrInitiateSerializer,
)
from .services.cashier_shifts import get_shift_collection_totals
from .services.telebirr import MockTelebirrService


class CashierShiftViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = CashierShift.objects.select_related(
        'cashier', 'closed_by').all()
    serializer_class = CashierShiftSerializer
    permission_classes = [IsFrontOfficeStaff | IsFinanceStaff]

    @action(detail=False, methods=['post'], url_path='open')
    def open_shift(self, request):
        serializer = OpenCashierShiftSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        property_config = Property.objects.order_by('created_at').first()
        business_date = (
            property_config.current_business_date
            if property_config else timezone.localdate()
        )
        shift_name = serializer.validated_data['shift_name']
        try:
            with transaction.atomic():
                if CashierShift.objects.select_for_update().filter(
                    business_date=business_date,
                    shift_name=shift_name,
                ).exists():
                    return Response(
                        {'detail': 'This shift slot already has a record for the business date.'},
                        status=status.HTTP_409_CONFLICT,
                    )
                shift = CashierShift.objects.create(
                    business_date=business_date,
                    shift_name=shift_name,
                    cashier=request.user,
                    cashier_name=request.user.full_name,
                    cashier_role=request.user.get_role_display(),
                    opening_float=serializer.validated_data['opening_float'],
                )
                log_audit_event(
                    module=AuditModule.FOLIO,
                    action='CASHIER_SHIFT_OPENED',
                    details=f'{request.user.full_name} opened {shift.shift_name} for {business_date} with an opening float of {shift.opening_float} ETB.',
                    request=request,
                    after_state={
                        'shift_id': str(shift.pk),
                        'business_date': str(business_date),
                        'shift_name': shift.shift_name,
                        'cashier_id': str(request.user.pk),
                        'opening_float': str(shift.opening_float),
                    },
                )
        except IntegrityError:
            return Response(
                {'detail': 'This shift slot already has a record for the business date.'},
                status=status.HTTP_409_CONFLICT,
            )

        return Response(CashierShiftSerializer(shift).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='close')
    def close_shift(self, request, pk=None):
        serializer = CloseCashierShiftSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        manager_roles = {
            StaffRole.GENERAL_MANAGER,
            StaffRole.FRONT_OFFICE_MANAGER,
            StaffRole.FINANCE_OFFICER,
            StaffRole.SYSTEM_ADMIN,
        }
        with transaction.atomic():
            shift = get_object_or_404(
                CashierShift.objects.select_for_update(), pk=pk)
            if shift.status != 'OPEN':
                return Response(
                    {'detail': 'This cashier shift is already closed.'},
                    status=status.HTTP_409_CONFLICT,
                )
            if shift.cashier_id != request.user.pk and not (
                request.user.is_superuser or request.user.role in manager_roles
            ):
                return Response(
                    {'detail': 'Only the assigned cashier or an authorized manager may close this shift.'},
                    status=status.HTTP_403_FORBIDDEN,
                )

            closed_at = timezone.now()
            totals = get_shift_collection_totals(
                shift.cashier, shift.opened_at, closed_at)
            actual_cash = serializer.validated_data['actual_closing_cash']
            discrepancy = actual_cash - \
                shift.opening_float - totals['cash_collected']
            notes = serializer.validated_data['handover_notes'].strip()
            if discrepancy != Decimal('0.00') and not notes:
                return Response(
                    {'handover_notes': [
                        'A reason is required when the drawer does not balance.']},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            for field, value in totals.items():
                setattr(shift, field, value)
            shift.actual_closing_cash = actual_cash
            shift.discrepancy = discrepancy
            shift.status = 'CLOSED'
            shift.closed_at = closed_at
            shift.closed_by = request.user
            shift.handover_notes = notes
            shift.save(update_fields=[
                'cash_collected', 'telebirr_collected', 'cbe_card_collected',
                'bank_transfer_collected', 'actual_closing_cash', 'discrepancy',
                'status', 'closed_at', 'closed_by', 'handover_notes',
            ])
            log_audit_event(
                module=AuditModule.FOLIO,
                action='CASHIER_SHIFT_CLOSED',
                details=f'{shift.shift_name} closed by {request.user.full_name}; counted cash {actual_cash} ETB; discrepancy {discrepancy} ETB.',
                request=request,
                before_state={'status': 'OPEN'},
                after_state={
                    'shift_id': str(shift.pk),
                    'cashier_id': str(shift.cashier_id) if shift.cashier_id else None,
                    'cash_collected': str(shift.cash_collected),
                    'telebirr_collected': str(shift.telebirr_collected),
                    'cbe_card_collected': str(shift.cbe_card_collected),
                    'bank_transfer_collected': str(shift.bank_transfer_collected),
                    'actual_closing_cash': str(actual_cash),
                    'discrepancy': str(discrepancy),
                    'handover_notes': notes,
                },
            )
        return Response(CashierShiftSerializer(shift).data)


class FolioViewSet(AuditedModelViewSetMixin, viewsets.ModelViewSet):
    """
    Folio management: View invoices, post charges, settle balances, and process Telebirr payments.
    """
    queryset = Folio.objects.all().prefetch_related(
        'items', 'payments', 'guest', 'reservation__room')
    serializer_class = FolioSerializer
    audit_module = AuditModule.FOLIO
    audit_name = 'FOLIO'
    audit_fields = ('id', 'reservation_id', 'is_closed', 'closed_at')

    def get_permissions(self):
        permission_class = IsFinanceStaff if self.action in [
            'telebirr_pay', 'confirm_payment'] else IsFrontOfficeStaff
        return [permission_class()]

    @action(detail=True, methods=['post'], url_path='post-charge')
    def post_charge(self, request, pk=None):
        folio = self.get_object()
        if folio.is_closed:
            return Response({'error': 'Cannot post charges to a closed folio.'}, status=status.HTTP_400_BAD_REQUEST)

        serializer = FolioItemSerializer(data=request.data)
        if serializer.is_valid():
            item = serializer.save(
                folio=folio,
                posted_by=request.user if request.user.is_authenticated else None
            )
            log_audit_event(
                module=AuditModule.FOLIO,
                action='FOLIO_CHARGE_POSTED',
                details=f'Charge posted to folio {folio.pk} ({item.category}, {item.amount} ETB).',
                request=request,
                after_state={
                    'folio_id': str(folio.pk),
                    'item_id': str(item.pk),
                    'category': item.category,
                    'amount': str(item.amount),
                },
            )
            return Response(FolioSerializer(folio).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], url_path='telebirr-pay')
    def telebirr_pay(self, request, pk=None):
        """Initiates Telebirr checkout (H5 / USSD flow)"""
        folio = self.get_object()
        init_serializer = TelebirrInitiateSerializer(data=request.data)
        if not init_serializer.is_valid():
            return Response(init_serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        amount = init_serializer.validated_data['amount']
        notes = init_serializer.validated_data.get(
            'notes', 'Hotel Stay & Incidentals')

        out_trade_no = f"RES-{folio.reservation.confirmation_code}-{uuid.uuid4().hex[:6].upper()}"
        telebirr_service = MockTelebirrService()

        # Initiate with provider
        gateway_resp = telebirr_service.initiate_payment(
            out_trade_no=out_trade_no,
            amount=amount,
            subject=f"Folio payment for {folio.guest.full_name}",
            return_url="http://localhost:3000/billing"
        )

        # Record payment transaction in PENDING state
        payment = Payment.objects.create(
            folio=folio,
            method='TELEBIRR',
            amount=amount,
            currency='ETB',
            status='PENDING',
            telebirr_transaction_id=gateway_resp.get(
                'telebirr_transaction_id'),
            out_trade_no=out_trade_no,
            notes=notes,
            received_by=request.user if request.user.is_authenticated else None
        )
        log_audit_event(
            module=AuditModule.FOLIO,
            action='PAYMENT_INITIATED',
            details=f'Telebirr payment initiated for folio {folio.pk} ({payment.amount} ETB).',
            request=request,
            after_state={
                'folio_id': str(folio.pk),
                'payment_id': str(payment.pk),
                'method': payment.method,
                'amount': str(payment.amount),
                'status': payment.status,
                'out_trade_no': payment.out_trade_no,
            },
        )

        return Response({
            'payment_id': payment.id,
            'gateway_response': gateway_resp
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='confirm-payment')
    def confirm_payment(self, request, pk=None):
        """Confirms payment once verified via callback or manual cashier receipt"""
        payment_id = request.data.get('payment_id')
        payment = get_object_or_404(Payment, id=payment_id, folio_id=pk)
        before_state = {'status': payment.status}
        payment.status = 'COMPLETED'
        payment.received_by = request.user
        payment.completed_at = timezone.now()
        payment.save(update_fields=['status', 'received_by', 'completed_at'])
        log_audit_event(
            module=AuditModule.FOLIO,
            action='PAYMENT_CONFIRMED',
            details=f'Payment {payment.pk} confirmed for folio {payment.folio_id}.',
            request=request,
            before_state=before_state,
            after_state={'status': payment.status, 'amount': str(
                payment.amount), 'method': payment.method},
        )
        return Response({'success': True, 'folio': FolioSerializer(payment.folio).data})
