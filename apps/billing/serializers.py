from decimal import Decimal
from rest_framework import serializers
from .models import CashierShift, Folio, FolioItem, Payment
from .services.cashier_shifts import get_shift_collection_totals


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
            'completed_at',
            'created_at',
        ]
        read_only_fields = ['id', 'completed_at', 'created_at']


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


class CashierShiftSerializer(serializers.ModelSerializer):
    cashier_role = serializers.CharField(read_only=True)
    cash_collected = serializers.SerializerMethodField()
    telebirr_collected = serializers.SerializerMethodField()
    cbe_card_collected = serializers.SerializerMethodField()
    bank_transfer_collected = serializers.SerializerMethodField()

    class Meta:
        model = CashierShift
        fields = [
            'id', 'business_date', 'shift_name', 'cashier', 'cashier_name',
            'cashier_role', 'opening_float', 'cash_collected',
            'telebirr_collected', 'cbe_card_collected',
            'bank_transfer_collected', 'actual_closing_cash',
            'discrepancy', 'status', 'opened_at', 'closed_at',
            'closed_by', 'handover_notes',
        ]
        read_only_fields = fields

    def _totals(self, instance):
        if hasattr(instance, '_shift_collection_totals'):
            return instance._shift_collection_totals
        if instance.status == 'CLOSED':
            instance._shift_collection_totals = {
                'cash_collected': instance.cash_collected,
                'telebirr_collected': instance.telebirr_collected,
                'cbe_card_collected': instance.cbe_card_collected,
                'bank_transfer_collected': instance.bank_transfer_collected,
            }
        else:
            from django.utils import timezone
            instance._shift_collection_totals = get_shift_collection_totals(
                instance.cashier, instance.opened_at, timezone.now())
        return instance._shift_collection_totals

    def get_cash_collected(self, instance):
        return self._totals(instance)['cash_collected']

    def get_telebirr_collected(self, instance):
        return self._totals(instance)['telebirr_collected']

    def get_cbe_card_collected(self, instance):
        return self._totals(instance)['cbe_card_collected']

    def get_bank_transfer_collected(self, instance):
        return self._totals(instance)['bank_transfer_collected']


class OpenCashierShiftSerializer(serializers.Serializer):
    shift_name = serializers.ChoiceField(choices=CashierShift.SHIFT_SLOTS)
    opening_float = serializers.DecimalField(
        max_digits=12, decimal_places=2, min_value=0)


class CloseCashierShiftSerializer(serializers.Serializer):
    actual_closing_cash = serializers.DecimalField(
        max_digits=12, decimal_places=2, min_value=0)
    handover_notes = serializers.CharField(
        required=False, allow_blank=True, default='')
