from decimal import Decimal
from rest_framework import serializers
from .models import Folio, FolioItem, Payment


class FolioItemSerializer(serializers.ModelSerializer):
    posted_by_name = serializers.CharField(
        source='posted_by.get_full_name', read_only=True)

    class Meta:
        model = FolioItem
        fields = [
            'id',
            'folio',
            'category',
            'description',
            'amount',
            'reference_id',
            'posted_by',
            'posted_by_name',
            'posted_at',
        ]
        read_only_fields = ['id', 'posted_at']


class PaymentSerializer(serializers.ModelSerializer):
    received_by_name = serializers.CharField(
        source='received_by.get_full_name', read_only=True)

    class Meta:
        model = Payment
        fields = [
            'id',
            'folio',
            'method',
            'amount',
            'currency',
            'status',
            'telebirr_transaction_id',
            'out_trade_no',
            'notes',
            'received_by',
            'received_by_name',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class FolioSerializer(serializers.ModelSerializer):
    items = FolioItemSerializer(many=True, read_only=True)
    payments = PaymentSerializer(many=True, read_only=True)
    total_charges = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True)
    total_payments = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True)
    balance_due = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True)
    guest_name = serializers.CharField(
        source='guest.full_name', read_only=True)
    room_number = serializers.CharField(
        source='reservation.room.room_number', read_only=True)

    class Meta:
        model = Folio
        fields = [
            'id',
            'reservation',
            'guest',
            'guest_name',
            'room_number',
            'is_closed',
            'closed_at',
            'total_charges',
            'total_payments',
            'balance_due',
            'items',
            'payments',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class TelebirrInitiateSerializer(serializers.Serializer):
    folio_id = serializers.UUIDField()
    amount = serializers.DecimalField(
        max_digits=10, decimal_places=2, min_value=Decimal('1.00'))
    phone_number = serializers.CharField(
        max_length=15, required=False, allow_blank=True)
    notes = serializers.CharField(
        max_length=255, required=False, allow_blank=True)
