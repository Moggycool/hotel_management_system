from rest_framework import serializers, viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.crypto import get_random_string
from decimal import Decimal

from apps.accounts.models import StaffRole
from apps.billing.models import Folio, Payment
from apps.guests.models import Guest, IDType, VIPTier
from apps.properties.models import Property
from apps.reservations.models import Reservation, ReservationStatus, RoomHold
from apps.reservations.serializers import (
    PublicBookingSerializer,
    RecordReservationDepositSerializer,
    ReservationSerializer,
    RoomHoldSerializer,
)
from apps.rooms.models import RatePlan, Room, RoomStatus
from apps.rooms.services import AvailabilityEngine
from apps.housekeeping.models import HousekeepingTask
from apps.accounts.permissions import IsFrontOfficeStaff, IsReservationRoomAssignmentStaff
from apps.audit.mixins import AuditedModelViewSetMixin
from apps.audit.models import AuditModule
from apps.audit.services import log_audit_event
from apps.reservations.throttles import PublicBookingThrottle, PublicReadThrottle


class ReservationViewSet(AuditedModelViewSetMixin, viewsets.ModelViewSet):
    http_method_names = ['get', 'post', 'put', 'patch', 'head', 'options']
    queryset = Reservation.objects.select_related(
        'guest', 'room', 'rate_plan').all()
    serializer_class = ReservationSerializer
    audit_module = AuditModule.RESERVATION
    audit_name = 'RESERVATION'
    audit_create_action = 'RESERVATION_UPSERTED'
    audit_fields = ('id', 'confirmation_code', 'status',
                    'room_id', 'check_in_date', 'check_out_date')

    def get_throttles(self):
        if self.action == 'public_booking':
            return [PublicBookingThrottle()]
        if self.action in ['public_info', 'public_quote']:
            return [PublicReadThrottle()]
        return super().get_throttles()

    def get_permissions(self):
        if self.action in ['health_check', 'public_info', 'public_quote', 'public_booking']:
            permission_class = AllowAny
        elif self.action in ['list', 'retrieve']:
            permission_class = IsAuthenticated
        elif self.action == 'change_room':
            permission_class = IsReservationRoomAssignmentStaff
        else:
            permission_class = IsFrontOfficeStaff
        return [permission_class()]

    @action(detail=False, methods=['get'], url_path='public-info')
    def public_info(self, request):
        property_config = Property.objects.order_by('created_at').first()
        rate_plan = RatePlan.objects.filter(
            is_active=True, is_resident_only=False).order_by('name').first()
        return Response({
            'property_name': property_config.name if property_config else 'Hotel',
            'name_amharic': property_config.name_amharic if property_config else '',
            'tagline': property_config.tagline if property_config else '',
            'address': property_config.address if property_config else '',
            'phone': property_config.phone if property_config else '',
            'email': property_config.email if property_config else '',
            'currency': property_config.currency if property_config else 'ETB',
            'check_in_time': property_config.check_in_time.strftime('%H:%M') if property_config else '14:00',
            'check_out_time': property_config.check_out_time.strftime('%H:%M') if property_config else '11:00',
            'vat_rate': str(property_config.vat_rate if property_config else Decimal('0.15')),
            'service_charge_rate': str(property_config.service_charge_rate if property_config else Decimal('0.10')),
            'rate_plan': {
                'id': str(rate_plan.id),
                'name': rate_plan.name,
                'multiplier': str(rate_plan.multiplier),
                'fixed_surcharge_etb': str(rate_plan.fixed_surcharge_etb),
            } if rate_plan else None,
        })

    @action(detail=False, methods=['get'], url_path='public-quote')
    def public_quote(self, request):
        try:
            room_id = request.query_params.get('room_id')
            check_in = timezone.datetime.strptime(
                request.query_params.get('check_in', ''), '%Y-%m-%d').date()
            check_out = timezone.datetime.strptime(
                request.query_params.get('check_out', ''), '%Y-%m-%d').date()
            adults = int(request.query_params.get('adults', '1'))
            children = int(request.query_params.get('children', '0'))
        except (TypeError, ValueError):
            return Response(
                {'detail': 'Provide a room, valid stay dates, and guest counts.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if check_in < timezone.localdate() or check_in >= check_out or adults < 1 or children < 0:
            return Response({'detail': 'Stay dates or guest counts are invalid.'}, status=status.HTTP_400_BAD_REQUEST)

        room = get_object_or_404(
            Room.objects.select_related('room_type'), pk=room_id,
            is_active=True,
        )
        if adults > room.room_type.max_adults or children > room.room_type.max_children:
            return Response({'detail': 'Guest count exceeds this room type capacity.'}, status=status.HTTP_400_BAD_REQUEST)
        if not AvailabilityEngine.get_available_rooms(check_in, check_out).filter(
            pk=room.pk, housekeeping_status='CLEAN',
        ).exists():
            return Response({'detail': 'This room is no longer available for those dates.'}, status=status.HTTP_409_CONFLICT)

        rate_plan = RatePlan.objects.filter(
            is_active=True, is_resident_only=False).order_by('name').first()
        if rate_plan is None:
            return Response({'detail': 'No active rate plan is configured.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        nights = (check_out - check_in).days
        nightly_rate = rate_plan.calculate_nightly_rate(
            room.room_type.base_price_etb).quantize(Decimal('0.01'))
        room_subtotal = nightly_rate * nights
        property_config = Property.objects.order_by('created_at').first()
        service_rate = property_config.service_charge_rate if property_config else Decimal(
            '0.10')
        vat_rate = property_config.vat_rate if property_config else Decimal(
            '0.15')
        service_charge = (
            room_subtotal * service_rate).quantize(Decimal('0.01'))
        vat = ((room_subtotal + service_charge) *
               vat_rate).quantize(Decimal('0.01'))
        return Response({
            'room_id': str(room.id),
            'room_type': room.room_type.name,
            'nights': nights,
            'nightly_rate_etb': f'{nightly_rate:.2f}',
            'room_subtotal_etb': f'{room_subtotal:.2f}',
            'service_charge_etb': f'{service_charge:.2f}',
            'vat_etb': f'{vat:.2f}',
            'grand_total_etb': f'{room_subtotal + service_charge + vat:.2f}',
            'currency': property_config.currency if property_config else 'ETB',
            'rate_plan': rate_plan.name,
        })

    @action(detail=False, methods=['post'], url_path='public-booking')
    @transaction.atomic
    def public_booking(self, request):
        serializer = PublicBookingSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        data = serializer.validated_data
        room = get_object_or_404(
            Room.objects.select_for_update().select_related('room_type'),
            pk=data['room_id'], is_active=True,
        )
        if data['adults'] > room.room_type.max_adults or data['children'] > room.room_type.max_children:
            return Response({'detail': 'Guest count exceeds this room type capacity.'}, status=status.HTTP_400_BAD_REQUEST)
        if not AvailabilityEngine.get_available_rooms(
            data['check_in_date'], data['check_out_date'],
        ).filter(pk=room.pk, housekeeping_status='CLEAN').exists():
            return Response({'detail': 'This room is no longer available for those dates.'}, status=status.HTTP_409_CONFLICT)

        rate_plan = RatePlan.objects.filter(
            is_active=True, is_resident_only=False).order_by('name').first()
        if rate_plan is None:
            return Response({'detail': 'No active rate plan is configured.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        nights = (data['check_out_date'] - data['check_in_date']).days
        room_subtotal = rate_plan.calculate_nightly_rate(
            room.room_type.base_price_etb).quantize(Decimal('0.01')) * nights
        property_config = Property.objects.order_by('created_at').first()
        service_rate = property_config.service_charge_rate if property_config else Decimal(
            '0.10')
        vat_rate = property_config.vat_rate if property_config else Decimal(
            '0.15')
        service_charge = (
            room_subtotal * service_rate).quantize(Decimal('0.01'))
        vat = ((room_subtotal + service_charge) *
               vat_rate).quantize(Decimal('0.01'))
        grand_total = room_subtotal + service_charge + vat

        guest = Guest.objects.filter(
            email__iexact=data['guest_email']).first() if data['guest_email'] else None
        if guest is None:
            guest = Guest.objects.create(
                full_name=data['guest_name'],
                email=data['guest_email'] or None,
                phone_number=data['guest_phone'],
                id_type=IDType.FAYDA,
                id_number='',
                nationality=data['nationality'] or 'Not provided',
                vip_tier=VIPTier.REGULAR,
                privacy_consent_given=data['privacy_consent'],
            )

        confirmation_code = f'WEB-{get_random_string(8).upper()}'
        while Reservation.objects.filter(confirmation_code=confirmation_code).exists():
            confirmation_code = f'WEB-{get_random_string(8).upper()}'
        reservation = Reservation.objects.create(
            confirmation_code=confirmation_code,
            guest=guest,
            room=room,
            rate_plan=rate_plan,
            check_in_date=data['check_in_date'],
            check_out_date=data['check_out_date'],
            adults=data['adults'],
            children=data['children'],
            source='WEBSITE',
            status=ReservationStatus.PAYMENT_PENDING,
            room_rate_total_etb=room_subtotal,
            service_charge_etb=service_charge,
            vat_etb=vat,
            grand_total_etb=grand_total,
            deposit_paid_etb=Decimal('0.00'),
            special_requests=data['special_requests'],
        )
        log_audit_event(
            module=AuditModule.RESERVATION,
            action='PUBLIC_RESERVATION_CREATED',
            details=f'Public website booking {confirmation_code} created for room type {room.room_type.name}.',
            request=request,
            after_state={
                'reservation_id': str(reservation.pk),
                'confirmation_code': confirmation_code,
                'room_id': str(room.pk),
                'check_in_date': str(data['check_in_date']),
                'check_out_date': str(data['check_out_date']),
                'grand_total_etb': str(grand_total),
            },
        )
        return Response({
            'success': True,
            'deposit_required': True,
            'deposit_required_etb': f'{grand_total:.2f}',
            'payment_due_at_property': True,
            'reservation': ReservationSerializer(reservation).data,
        }, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'], url_path='record-deposit')
    @transaction.atomic
    def record_deposit(self, request):
        serializer = RecordReservationDepositSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        confirmation_code = str(request.data.get(
            'confirmation_code', '')).strip()
        if not confirmation_code:
            return Response(
                {'confirmation_code': ['This field is required.']},
                status=status.HTTP_400_BAD_REQUEST,
            )

        reservation = get_object_or_404(
            Reservation.objects.select_for_update().select_related('guest'),
            confirmation_code=confirmation_code,
        )
        if reservation.status != ReservationStatus.PAYMENT_PENDING:
            return Response(
                {'detail': 'Only a booking awaiting deposit can be confirmed.'},
                status=status.HTTP_409_CONFLICT,
            )
        room = Room.objects.select_for_update().get(pk=reservation.room_id)
        if not AvailabilityEngine.get_available_rooms(
            reservation.check_in_date, reservation.check_out_date,
        ).filter(pk=room.pk, housekeeping_status='CLEAN').exists():
            return Response(
                {'detail': 'The room is no longer available. The booking cannot be confirmed; do not collect a deposit.'},
                status=status.HTTP_409_CONFLICT,
            )
        amount = serializer.validated_data['amount']
        if amount > reservation.grand_total_etb - reservation.deposit_paid_etb:
            return Response(
                {'amount': [
                    'Deposit cannot exceed the outstanding reservation total.']},
                status=status.HTTP_400_BAD_REQUEST,
            )

        folio, _ = Folio.objects.get_or_create(
            reservation=reservation,
            defaults={'guest': reservation.guest},
        )
        reference = serializer.validated_data['reference'].strip()
        payment_notes = serializer.validated_data['notes'].strip()
        if reference:
            payment_notes = f'Reference: {reference}' + \
                (f' | {payment_notes}' if payment_notes else '')
        payment = Payment.objects.create(
            folio=folio,
            method=serializer.validated_data['method'],
            amount=amount,
            currency='ETB',
            status='COMPLETED',
            out_trade_no=f'RES-DEPOSIT-{reservation.confirmation_code}-{get_random_string(8).upper()}',
            notes=payment_notes,
            received_by=request.user,
            completed_at=timezone.now(),
        )
        reservation.deposit_paid_etb += amount
        reservation.status = ReservationStatus.CONFIRMED
        reservation.save(
            update_fields=['deposit_paid_etb', 'status', 'updated_at'])
        log_audit_event(
            module=AuditModule.FOLIO,
            action='RESERVATION_DEPOSIT_RECORDED',
            details=f'Deposit of {amount} ETB recorded for reservation {reservation.confirmation_code}; reservation confirmed.',
            request=request,
            before_state={
                'status': ReservationStatus.PAYMENT_PENDING,
                'deposit_paid_etb': str(reservation.deposit_paid_etb - amount),
            },
            after_state={
                'status': reservation.status,
                'deposit_paid_etb': str(reservation.deposit_paid_etb),
                'payment_id': str(payment.pk),
                'payment_method': payment.method,
                'payment_amount': str(payment.amount),
                'reference': reference,
            },
        )
        return Response({
            'reservation': ReservationSerializer(reservation).data,
            'payment': {
                'id': str(payment.pk),
                'amount': str(payment.amount),
                'method': payment.method,
                'status': payment.status,
            },
        })

    @action(detail=False, methods=['get'], url_path='health')
    def health_check(self, request):
        """Diagnostic health check endpoint for React front desk client."""
        return Response({
            'status': 'online',
            'database': 'django_sqlite3',
            'reservation_count': Reservation.objects.count(),
            'message': 'Django REST Reservations API is online and operational.'
        })

    @action(detail=True, methods=['patch'], url_path='change-room')
    def change_room(self, request, pk=None):
        room_id_serializer = serializers.UUIDField()
        try:
            room_id = room_id_serializer.run_validation(
                request.data.get('room_id'))
        except serializers.ValidationError as error:
            return Response({'room_id': error.detail}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            reservation = get_object_or_404(
                Reservation.objects.select_for_update().select_related('room'),
                pk=pk,
            )
            if reservation.status not in [
                ReservationStatus.PAYMENT_PENDING,
                ReservationStatus.CONFIRMED,
            ]:
                return Response(
                    {'detail': 'Room assignment can only be changed before check-in.'},
                    status=status.HTTP_409_CONFLICT,
                )

            room = get_object_or_404(
                Room.objects.select_for_update().select_related('room_type'),
                pk=room_id,
                is_active=True,
            )
            if room.status != RoomStatus.VACANT_CLEAN or room.housekeeping_status != 'CLEAN':
                return Response(
                    {'detail': 'Choose a clean, vacant room.'},
                    status=status.HTTP_409_CONFLICT,
                )
            if not AvailabilityEngine.get_available_rooms(
                reservation.check_in_date,
                reservation.check_out_date,
                exclude_reservation_id=reservation.pk,
            ).filter(pk=room.pk).exists():
                return Response(
                    {'detail': 'This room is unavailable for the reservation dates.'},
                    status=status.HTTP_409_CONFLICT,
                )

            previous_room = reservation.room
            if previous_room.pk != room.pk:
                reservation.room = room
                reservation.save(update_fields=['room', 'updated_at'])
                log_audit_event(
                    module=AuditModule.RESERVATION,
                    action='RESERVATION_ROOM_CHANGED',
                    details=(
                        f'Reservation {reservation.confirmation_code} moved from '
                        f'room {previous_room.room_number} to room {room.room_number}.'
                    ),
                    request=request,
                    before_state={'room_id': str(
                        previous_room.pk), 'room_number': previous_room.room_number},
                    after_state={'room_id': str(
                        room.pk), 'room_number': room.room_number},
                )

        return Response(ReservationSerializer(reservation).data)

    @action(detail=False, methods=['post'], url_path='check-in')
    def check_in(self, request):
        confirmation_code = request.data.get('confirmation_code')
        if not confirmation_code:
            return Response({'error': 'confirmation_code is required.'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            reservation = get_object_or_404(
                Reservation.objects.select_for_update().select_related('room'),
                confirmation_code=confirmation_code,
            )
            if reservation.status != 'CONFIRMED':
                return Response({'error': 'Only confirmed reservations can be checked in.'}, status=status.HTTP_409_CONFLICT)
            if reservation.deposit_paid_etb <= Decimal('0.00'):
                return Response({'error': 'A recorded deposit is required before check-in.'}, status=status.HTTP_409_CONFLICT)
            if reservation.check_in_date > timezone.localdate():
                return Response({'error': 'The reservation arrival date has not been reached.'}, status=status.HTTP_400_BAD_REQUEST)

            room = Room.objects.select_for_update().get(pk=reservation.room_id)
            if room.status != RoomStatus.VACANT_CLEAN or room.housekeeping_status != 'CLEAN':
                return Response({'error': 'The assigned room is not clean and available for check-in.'}, status=status.HTTP_409_CONFLICT)
            if Reservation.objects.filter(room=room, status='CHECKED_IN').exclude(pk=reservation.pk).exists():
                return Response({'error': 'Another checked-in reservation already occupies this room.'}, status=status.HTTP_409_CONFLICT)

            reservation.status = 'CHECKED_IN'
            reservation.actual_check_in_time = timezone.now()
            reservation.save(
                update_fields=['status', 'actual_check_in_time', 'updated_at'])
            room.status = RoomStatus.OCCUPIED
            room.save(update_fields=['status'])
            log_audit_event(
                module=AuditModule.RESERVATION,
                action='RESERVATION_CHECKED_IN',
                details=f'Reservation {reservation.confirmation_code} checked in to room {room.room_number}.',
                request=request,
                before_state={'reservation_status': 'CONFIRMED',
                              'room_status': RoomStatus.VACANT_CLEAN},
                after_state={'reservation_status': reservation.status,
                             'room_status': room.status},
            )

        return Response(ReservationSerializer(reservation).data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], url_path='check-out')
    def check_out(self, request):
        confirmation_code = request.data.get('confirmation_code')
        if not confirmation_code:
            return Response({'error': 'confirmation_code is required.'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            reservation = get_object_or_404(
                Reservation.objects.select_for_update().select_related('room'),
                confirmation_code=confirmation_code,
            )
            if reservation.status != 'CHECKED_IN':
                return Response({'error': 'Only checked-in reservations can be checked out.'}, status=status.HTTP_409_CONFLICT)

            room = Room.objects.select_for_update().get(pk=reservation.room_id)
            reservation.status = 'CHECKED_OUT'
            reservation.actual_check_out_time = timezone.now()
            reservation.save(
                update_fields=['status', 'actual_check_out_time', 'updated_at'])
            room.status = RoomStatus.VACANT_DIRTY
            room.housekeeping_status = 'DIRTY'
            room.save(update_fields=['status', 'housekeeping_status'])
            HousekeepingTask.objects.create(
                room=room,
                task_type='CHECKOUT_CLEAN',
                status='PENDING',
                priority='HIGH',
                notes=f'Checkout cleaning for reservation {reservation.confirmation_code}.',
            )
            log_audit_event(
                module=AuditModule.RESERVATION,
                action='RESERVATION_CHECKED_OUT',
                details=f'Reservation {reservation.confirmation_code} checked out; room {room.room_number} queued for cleaning.',
                request=request,
                before_state={'reservation_status': 'CHECKED_IN',
                              'room_status': RoomStatus.OCCUPIED},
                after_state={'reservation_status': reservation.status,
                             'room_status': room.status},
            )

        return Response(ReservationSerializer(reservation).data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], url_path='cancel')
    def cancel_reservation(self, request):
        confirmation_code = request.data.get('confirmation_code')
        if not confirmation_code:
            return Response({'error': 'confirmation_code is required.'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            reservation = get_object_or_404(
                Reservation.objects.select_for_update(),
                confirmation_code=confirmation_code,
            )
            if reservation.status not in [
                ReservationStatus.CONFIRMED,
                ReservationStatus.PAYMENT_PENDING,
            ]:
                return Response({'error': 'Only pending or confirmed reservations can be cancelled.'}, status=status.HTTP_409_CONFLICT)
            previous_status = reservation.status
            reservation.status = 'CANCELLED'
            reservation.save(update_fields=['status', 'updated_at'])
            log_audit_event(
                module=AuditModule.RESERVATION,
                action='RESERVATION_CANCELLED',
                details=(
                    f'Reservation {reservation.confirmation_code} cancelled. '
                    f'Payment of {reservation.deposit_paid_etb} ETB remains recorded; '
                    'no refund was initiated.'
                ),
                request=request,
                before_state={
                    'status': previous_status,
                    'deposit_paid_etb': str(reservation.deposit_paid_etb),
                },
                after_state={
                    'status': reservation.status,
                    'deposit_paid_etb': str(reservation.deposit_paid_etb),
                },
            )

        return Response(ReservationSerializer(reservation).data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], url_path='no-show')
    def mark_no_show(self, request):
        confirmation_code = request.data.get('confirmation_code')
        if not confirmation_code:
            return Response({'error': 'confirmation_code is required.'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            reservation = get_object_or_404(
                Reservation.objects.select_for_update(),
                confirmation_code=confirmation_code,
            )
            if reservation.status != 'CONFIRMED':
                return Response({'error': 'Only confirmed reservations can be marked as no-show.'}, status=status.HTTP_409_CONFLICT)
            if reservation.check_in_date > timezone.localdate():
                return Response({'error': 'A future arrival cannot be marked as a no-show.'}, status=status.HTTP_400_BAD_REQUEST)
            reservation.status = 'NO_SHOW'
            reservation.save(update_fields=['status', 'updated_at'])
            log_audit_event(
                module=AuditModule.RESERVATION,
                action='RESERVATION_MARKED_NO_SHOW',
                details=f'Reservation {reservation.confirmation_code} marked no-show.',
                request=request,
                before_state={'status': 'CONFIRMED'},
                after_state={'status': reservation.status},
            )

        return Response(ReservationSerializer(reservation).data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], url_path='bulk-sync')
    def bulk_sync(self, request):
        """
        Accepts a list of reservations from the Front Desk React app
        and upserts each one into the Django PostgreSQL/SQLite database.
        """
        raw_items = request.data
        if isinstance(raw_items, dict) and 'reservations' in raw_items:
            raw_items = raw_items['reservations']
        elif not isinstance(raw_items, list):
            raw_items = [raw_items]

        synced_records = []
        errors = []

        for item in raw_items:
            serializer = ReservationSerializer(data=item)
            if serializer.is_valid():
                try:
                    res_instance = serializer.save()
                    synced_records.append(
                        ReservationSerializer(res_instance).data)
                except Exception as ex:
                    errors.append(
                        {'item': item.get('confirmation_code', 'unknown'), 'error': str(ex)})
            else:
                errors.append(
                    {'item': item.get('confirmation_code', 'unknown'), 'errors': serializer.errors})

        return Response({
            'success': len(errors) == 0,
            'total_received': len(raw_items),
            'synced_count': len(synced_records),
            'database_total': Reservation.objects.count(),
            'errors': errors,
            'synced_reservations': synced_records,
        }, status=status.HTTP_200_OK if len(synced_records) > 0 else (
            status.HTTP_200_OK if len(
                raw_items) == 0 else status.HTTP_400_BAD_REQUEST
        ))


class RoomHoldViewSet(AuditedModelViewSetMixin, viewsets.ModelViewSet):
    queryset = RoomHold.objects.select_related('room').all()
    serializer_class = RoomHoldSerializer
    permission_classes = [IsFrontOfficeStaff]
    audit_module = AuditModule.RESERVATION
    audit_name = 'ROOM_HOLD'
    audit_fields = ('id', 'room_id', 'check_in_date', 'check_out_date')
