from rest_framework import viewsets

from apps.accounts.permissions import IsRestaurantStaff
from apps.kitchen.models import KitchenTicket
from apps.kitchen.serializers import KitchenTicketSerializer


class KitchenTicketViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = KitchenTicket.objects.select_related(
        'order').prefetch_related('items').all()
    serializer_class = KitchenTicketSerializer
    permission_classes = [IsRestaurantStaff]
