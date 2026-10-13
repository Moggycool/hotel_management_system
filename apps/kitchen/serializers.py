from rest_framework import serializers

from apps.kitchen.models import KitchenTicket
from apps.restaurant.serializers import RestaurantOrderItemSerializer


class KitchenTicketSerializer(serializers.ModelSerializer):
    order_number = serializers.CharField(
        source='order.order_number', read_only=True)
    kot_number = serializers.CharField(
        source='order.kot_number', read_only=True)
    outlet = serializers.CharField(source='order.outlet', read_only=True)
    table_number = serializers.CharField(
        source='order.table_number', read_only=True)
    room_number = serializers.CharField(
        source='order.room_number', read_only=True)
    items = RestaurantOrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = KitchenTicket
        fields = [
            'id', 'ticket_number', 'order', 'order_number', 'kot_number',
            'outlet', 'table_number', 'room_number', 'station', 'status',
            'items', 'created_at', 'started_at', 'ready_at', 'served_at',
        ]
        read_only_fields = fields
