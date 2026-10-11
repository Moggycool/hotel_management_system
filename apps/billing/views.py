import uuid
from decimal import Decimal
from django.utils import timezone
from django.shortcuts import get_object_or_404
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import Folio, FolioItem, Payment
from .serializers import FolioSerializer, FolioItemSerializer, PaymentSerializer, TelebirrInitiateSerializer
from .services.telebirr import MockTelebirrService


class FolioViewSet(viewsets.ModelViewSet):
    """
    Folio management: View invoices, post charges, settle balances, and process Telebirr payments.
    """
    queryset = Folio.objects.all().prefetch_related(
        'items', 'payments', 'guest', 'reservation__room')
    serializer_class = FolioSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=True, methods=['post'], url_path='post-charge')
    def post_charge(self, request, pk=None):
        folio = self.get_object()
        if folio.is_closed:
            return Response({'error': 'Cannot post charges to a closed folio.'}, status=status.HTTP_400_BAD_REQUEST)

        serializer = FolioItemSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(
                folio=folio,
                posted_by=request.user if request.user.is_authenticated else None
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

        return Response({
            'payment_id': payment.id,
            'gateway_response': gateway_resp
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='confirm-payment')
    def confirm_payment(self, request, pk=None):
        """Confirms payment once verified via callback or manual cashier receipt"""
        payment_id = request.data.get('payment_id')
        payment = get_object_or_404(Payment, id=payment_id, folio_id=pk)
        payment.status = 'COMPLETED'
        payment.save()
        return Response({'success': True, 'folio': FolioSerializer(payment.folio).data})
