from decimal import Decimal, ROUND_HALF_UP
import uuid

from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework import serializers

from apps.properties.models import Property
from apps.restaurant.models import RestaurantMenuItem, RestaurantOrder, RestaurantOrderItem
from apps.kitchen.models import KitchenTicket


CENT = Decimal('0.01')


class RestaurantMenuItemSerializer(serializers.ModelSerializer):
    id = serializers.CharField(source='client_id', read_only=True)

    class Meta:
        model = RestaurantMenuItem
        fields = [
            'id', 'client_id', 'code', 'name', 'name_amharic', 'description',
            'category', 'price', 'station', 'is_fasting', 'is_spicy',
            'is_vegetarian', 'preparation_minutes', 'is_available', 'image_url',
        ]
        read_only_fields = ['id']


class RestaurantOrderItemSerializer(serializers.ModelSerializer):
    menu_item_id = serializers.CharField()
    name = serializers.CharField(read_only=True)
    name_amharic = serializers.CharField(read_only=True)
    unit_price = serializers.DecimalField(
        max_digits=10, decimal_places=2, read_only=True)
    station = serializers.CharField(read_only=True)

    class Meta:
        model = RestaurantOrderItem
        fields = [
            'id', 'menu_item_id', 'name', 'name_amharic', 'quantity',
            'unit_price', 'station', 'notes', 'status',
        ]
        read_only_fields = ['id', 'status']

    def validate(self, attrs):
        item_key = attrs.get('menu_item_id', '').strip()
        menu_item = RestaurantMenuItem.objects.filter(
            Q(client_id=item_key) | Q(code=item_key),
            is_available=True,
        ).first()
        if menu_item is None:
            raise serializers.ValidationError({
                'menu_item_id': 'Menu item does not exist or is unavailable.'
            })
        attrs['name'] = menu_item.name
        attrs['name_amharic'] = menu_item.name_amharic
        attrs['unit_price'] = menu_item.price
        attrs['station'] = menu_item.station
        return attrs


class RestaurantOrderSerializer(serializers.ModelSerializer):
    items = RestaurantOrderItemSerializer(many=True)
    send_to_kitchen = serializers.BooleanField(
        write_only=True, required=False, default=False)
    reservation_id = serializers.UUIDField(
        write_only=True, required=False, allow_null=True)
    waiter_name = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = RestaurantOrder
        fields = [
            'id', 'order_number', 'kot_number', 'order_type', 'outlet',
            'table_number', 'room_number', 'reservation', 'reservation_id',
            'guest_name', 'waiter', 'waiter_name', 'covers', 'items',
            'subtotal', 'service_charge', 'vat_amount', 'grand_total',
            'status', 'payment_method', 'payment_reference',
            'telebirr_transaction_id', 'void_reason', 'special_instructions',
            'send_to_kitchen', 'created_at', 'kot_sent_at', 'settled_at',
        ]
        read_only_fields = [
            'id', 'order_number', 'kot_number', 'subtotal', 'service_charge',
            'vat_amount', 'grand_total', 'status', 'payment_method',
            'payment_reference', 'telebirr_transaction_id', 'void_reason',
            'created_at', 'kot_sent_at', 'settled_at',
        ]

    def validate(self, attrs):
        order_type = attrs.get('order_type')
        reservation_id = attrs.get('reservation_id')
        if order_type == 'ROOM_SERVICE' and not reservation_id:
            raise serializers.ValidationError(
                {'reservation_id': 'Room service requires an active reservation.'})
        if reservation_id:
            from apps.reservations.models import Reservation
            try:
                reservation = Reservation.objects.get(pk=reservation_id)
            except Reservation.DoesNotExist as exc:
                raise serializers.ValidationError(
                    {'reservation_id': 'Reservation was not found.'}) from exc
            if reservation.status != 'CHECKED_IN':
                raise serializers.ValidationError(
                    {'reservation_id': 'Room service requires a checked-in reservation.'})
            attrs['_resolved_reservation'] = reservation
        if not attrs.get('items'):
            raise serializers.ValidationError(
                {'items': 'At least one order item is required.'})
        for item in attrs['items']:
            if item['quantity'] < 1:
                raise serializers.ValidationError(
                    {'items': 'Item quantity must be at least one.'})
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        items_data = validated_data.pop('items')
        send_to_kitchen = validated_data.pop('send_to_kitchen', False)
        reservation = validated_data.pop('_resolved_reservation', None)
        validated_data.pop('reservation_id', None)
        if reservation:
            validated_data['reservation'] = reservation
            validated_data.setdefault(
                'room_number', reservation.room.room_number)
            validated_data.setdefault(
                'guest_name', reservation.guest.full_name)

        waiter = self.context['request'].user
        validated_data['waiter'] = waiter
        validated_data['waiter_name'] = waiter.full_name

        subtotal = sum(
            (item['unit_price'] * item['quantity'] for item in items_data),
            Decimal('0.00'),
        ).quantize(CENT, rounding=ROUND_HALF_UP)
        property_config = Property.objects.order_by('created_at').first()
        service_rate = property_config.service_charge_rate if property_config else Decimal(
            '0.1000')
        vat_rate = property_config.vat_rate if property_config else Decimal(
            '0.1500')
        service_charge = (
            subtotal * service_rate).quantize(CENT, rounding=ROUND_HALF_UP)
        vat_amount = ((subtotal + service_charge) *
                      vat_rate).quantize(CENT, rounding=ROUND_HALF_UP)
        grand_total = subtotal + service_charge + vat_amount

        suffix = uuid.uuid4().hex[:8].upper()
        order_number = f'ORD-{timezone.localdate():%Y%m%d}-{suffix}'
        kot_number = f'KOT-{timezone.localdate():%Y%m%d}-{suffix}'
        now = timezone.now()
        order = RestaurantOrder.objects.create(
            **validated_data,
            order_number=order_number,
            kot_number=kot_number,
            subtotal=subtotal,
            service_charge=service_charge,
            vat_amount=vat_amount,
            grand_total=grand_total,
            status='SENT_TO_KITCHEN' if send_to_kitchen else 'OPEN',
            kot_sent_at=now if send_to_kitchen else None,
        )

        created_items = []
        for item_data in items_data:
            item_data['status'] = 'PREPARING' if send_to_kitchen else 'QUEUED'
            created_items.append(
                RestaurantOrderItem.objects.create(order=order, **item_data))

        if send_to_kitchen:
            self._create_kitchen_tickets(order, created_items)
        return order

    @staticmethod
    def _create_kitchen_tickets(order, items):
        by_station = {}
        for item in items:
            by_station.setdefault(item.station, []).append(item)
        for station, station_items in by_station.items():
            ticket = KitchenTicket.objects.create(
                ticket_number=f'{order.kot_number}-{station[:3]}',
                order=order,
                station=station,
                status='IN_PREPARATION',
                started_at=timezone.now(),
            )
            ticket.items.set(station_items)
