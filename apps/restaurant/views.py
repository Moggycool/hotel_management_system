from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.accounts.permissions import IsRestaurantMenuManager, IsRestaurantSettlementStaff, IsRestaurantStaff
from apps.audit.mixins import AuditedModelViewSetMixin
from apps.audit.models import AuditModule
from apps.audit.services import log_audit_event
from apps.kitchen.models import KitchenTicket
from apps.inventory.services import consume_order_recipes
from apps.restaurant.models import RestaurantMenuItem, RestaurantOrder, RestaurantOrderItem
from apps.restaurant.serializers import RestaurantMenuItemSerializer, RestaurantOrderSerializer


class RestaurantMenuItemViewSet(AuditedModelViewSetMixin, viewsets.ModelViewSet):
    queryset = RestaurantMenuItem.objects.all()
    serializer_class = RestaurantMenuItemSerializer
    lookup_field = 'client_id'
    audit_module = AuditModule.FOLIO
    audit_name = 'RESTAURANT_MENU_ITEM'
    audit_fields = ('id', 'client_id', 'code', 'name', 'price', 'is_available')

    def get_permissions(self):
        permission_class = IsRestaurantStaff if self.action in [
            'list', 'retrieve'] else IsRestaurantMenuManager
        return [permission_class()]


class RestaurantOrderViewSet(AuditedModelViewSetMixin, viewsets.ModelViewSet):
    queryset = RestaurantOrder.objects.prefetch_related(
        'items', 'kitchen_tickets').all()
    serializer_class = RestaurantOrderSerializer
    http_method_names = ['get', 'post', 'patch', 'head', 'options']
    audit_module = AuditModule.FOLIO
    audit_name = 'RESTAURANT_ORDER'
    audit_fields = ('id', 'order_number', 'order_type',
                    'status', 'grand_total')

    def get_permissions(self):
        permission_class = IsRestaurantSettlementStaff if self.action in [
            'settle', 'post_to_room', 'void'] else IsRestaurantStaff
        return [permission_class()]

    @action(detail=True, methods=['post'], url_path='send-to-kitchen')
    @transaction.atomic
    def send_to_kitchen(self, request, pk=None):
        order = get_object_or_404(
            RestaurantOrder.objects.select_for_update(), pk=pk)
        if order.status != 'OPEN':
            return Response({'detail': 'Only open orders can be sent to the kitchen.'}, status=status.HTTP_409_CONFLICT)
        items = list(order.items.select_for_update())
        if not items:
            return Response({'detail': 'Cannot send an order without items.'}, status=status.HTTP_400_BAD_REQUEST)

        order.status = 'SENT_TO_KITCHEN'
        order.kot_sent_at = timezone.now()
        order.save(update_fields=['status', 'kot_sent_at'])
        by_station = {}
        for item in items:
            item.status = 'PREPARING'
            item.save(update_fields=['status'])
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
        log_audit_event(
            module=AuditModule.FOLIO,
            action='RESTAURANT_ORDER_SENT_TO_KITCHEN',
            details=f'Order {order.order_number} sent to kitchen as {order.kot_number}.',
            request=request,
            before_state={'status': 'OPEN'},
            after_state={'status': order.status,
                         'ticket_count': len(by_station)},
        )
        return Response(self.get_serializer(order).data)

    @action(detail=True, methods=['post'], url_path='item-status')
    @transaction.atomic
    def set_item_status(self, request, pk=None):
        order = get_object_or_404(
            RestaurantOrder.objects.select_for_update(), pk=pk)
        if order.status not in ['SENT_TO_KITCHEN', 'IN_PREPARATION', 'READY', 'SERVED']:
            return Response({'detail': 'This order is not in an active kitchen workflow.'}, status=status.HTTP_409_CONFLICT)
        item_id = request.data.get('item_id')
        requested_status = request.data.get('status')
        transitions = {
            'QUEUED': {'PREPARING', 'CANCELLED'},
            'PREPARING': {'READY', 'CANCELLED'},
            'READY': {'SERVED', 'CANCELLED'},
            'SERVED': set(),
            'CANCELLED': set(),
        }
        if requested_status not in {value for values in transitions.values() for value in values}:
            return Response({'status': 'Provide a supported item status.'}, status=status.HTTP_400_BAD_REQUEST)
        item = get_object_or_404(
            RestaurantOrderItem.objects.select_for_update(), pk=item_id, order=order)
        previous_status = item.status
        if requested_status not in transitions[previous_status]:
            return Response({'detail': f'Cannot move an item from {previous_status} to {requested_status}.'}, status=status.HTTP_409_CONFLICT)
        item.status = requested_status
        item.save(update_fields=['status'])

        items = list(order.items.all())
        active_items = [
            value for value in items if value.status != 'CANCELLED']
        if active_items and all(value.status == 'SERVED' for value in active_items):
            order.status = 'SERVED'
        elif active_items and all(value.status in ['READY', 'SERVED'] for value in active_items):
            order.status = 'READY'
        else:
            order.status = 'IN_PREPARATION'
        order.save(update_fields=['status'])

        ticket_status = 'SERVED' if all(value.status in ['SERVED', 'CANCELLED'] for value in items) else (
            'READY' if all(value.status in [
                           'READY', 'SERVED', 'CANCELLED'] for value in items) else 'IN_PREPARATION'
        )
        for ticket in order.kitchen_tickets.all():
            ticket_items = list(ticket.items.all())
            if ticket_items and all(value.status in ['SERVED', 'CANCELLED'] for value in ticket_items):
                ticket.status = 'SERVED'
                ticket.served_at = timezone.now()
            elif ticket_items and all(value.status in ['READY', 'SERVED', 'CANCELLED'] for value in ticket_items):
                ticket.status = 'READY'
                ticket.ready_at = timezone.now()
            else:
                ticket.status = 'IN_PREPARATION'
            ticket.save(update_fields=['status', 'ready_at', 'served_at'])

        log_audit_event(
            module=AuditModule.FOLIO,
            action='KITCHEN_ORDER_ITEM_STATUS_CHANGED',
            details=f'Order {order.order_number} item {item.name} changed from {previous_status} to {requested_status}.',
            request=request,
            before_state={'item_status': previous_status},
            after_state={'item_status': item.status,
                         'order_status': order.status},
        )
        return Response(self.get_serializer(order).data)

    @action(detail=True, methods=['post'], url_path='settle')
    @transaction.atomic
    def settle(self, request, pk=None):
        order = get_object_or_404(
            RestaurantOrder.objects.select_for_update(), pk=pk)
        direct_sale_without_kitchen = order.status == 'OPEN' and not order.kitchen_tickets.exists()
        if order.status not in ['SERVED', 'READY'] and not direct_sale_without_kitchen:
            return Response({'detail': 'Only prepared orders can be settled.'}, status=status.HTTP_409_CONFLICT)
        method = request.data.get('payment_method')
        valid_methods = {
            choice[0] for choice in RestaurantOrder.PAYMENT_METHODS if choice[0] != 'ROOM_CHARGE'}
        if method not in valid_methods:
            return Response({'payment_method': 'Provide a valid settlement method.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            stock_movements = consume_order_recipes(order, actor=request.user)
        except ValidationError as error:
            return Response({'detail': ' '.join(error.messages)}, status=status.HTTP_409_CONFLICT)
        order.status = 'SETTLED'
        order.payment_method = method
        order.payment_reference = str(
            request.data.get('payment_reference', ''))
        order.telebirr_transaction_id = str(
            request.data.get('telebirr_transaction_id', ''))
        order.settled_at = timezone.now()
        order.settled_by = request.user
        order.save(update_fields=['status', 'payment_method',
                   'payment_reference', 'telebirr_transaction_id', 'settled_at',
                                  'settled_by'])
        log_audit_event(
            module=AuditModule.FOLIO,
            action='RESTAURANT_ORDER_SETTLED',
            details=f'Order {order.order_number} settled for {order.grand_total} ETB by {method}.',
            request=request,
            before_state={'status': 'SERVED'},
            after_state={'status': order.status,
                         'payment_method': method,
                         'amount': str(order.grand_total),
                         'settled_by': str(request.user.pk),
                         'stock_movements': [str(movement.pk) for movement in stock_movements]},
        )
        return Response(self.get_serializer(order).data)

    @action(detail=True, methods=['post'], url_path='void')
    @transaction.atomic
    def void(self, request, pk=None):
        order = get_object_or_404(
            RestaurantOrder.objects.select_for_update(), pk=pk)
        if order.status in ['SETTLED', 'POSTED_TO_ROOM', 'VOIDED']:
            return Response({'detail': 'This order cannot be voided.'}, status=status.HTTP_409_CONFLICT)
        reason = str(request.data.get('reason', '')).strip()
        if not reason:
            return Response({'reason': 'A void reason is required.'}, status=status.HTTP_400_BAD_REQUEST)
        previous_status = order.status
        order.status = 'VOIDED'
        order.void_reason = reason
        order.save(update_fields=['status', 'void_reason'])
        KitchenTicket.objects.filter(order=order).exclude(
            status='SERVED').update(status='VOIDED')
        log_audit_event(
            module=AuditModule.FOLIO,
            action='RESTAURANT_ORDER_VOIDED',
            details=f'Order {order.order_number} voided. Reason: {reason}.',
            request=request,
            severity='WARNING',
            before_state={'status': previous_status},
            after_state={'status': order.status, 'reason': reason},
        )
        return Response(self.get_serializer(order).data)
