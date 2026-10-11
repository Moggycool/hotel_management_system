from rest_framework import viewsets
from rest_framework.permissions import AllowAny

from apps.reservations.models import Reservation, RoomHold
from apps.reservations.serializers import ReservationSerializer, RoomHoldSerializer


class ReservationViewSet(viewsets.ModelViewSet):
    queryset = Reservation.objects.select_related(
        'guest', 'room', 'rate_plan').all()
    serializer_class = ReservationSerializer
    permission_classes = [AllowAny]


class RoomHoldViewSet(viewsets.ModelViewSet):
    queryset = RoomHold.objects.select_related('room').all()
    serializer_class = RoomHoldSerializer
    permission_classes = [AllowAny]
