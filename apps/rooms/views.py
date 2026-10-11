from rest_framework import viewsets
from rest_framework.permissions import AllowAny

from apps.rooms.models import RatePlan, Room, RoomType
from apps.rooms.serializers import RatePlanSerializer, RoomSerializer, RoomTypeSerializer


class RoomTypeViewSet(viewsets.ModelViewSet):
    queryset = RoomType.objects.all()
    serializer_class = RoomTypeSerializer
    permission_classes = [AllowAny]
    authentication_classes = []


class RatePlanViewSet(viewsets.ModelViewSet):
    queryset = RatePlan.objects.all()
    serializer_class = RatePlanSerializer
    permission_classes = [AllowAny]
    authentication_classes = []


class RoomViewSet(viewsets.ModelViewSet):
    queryset = Room.objects.select_related('room_type').all()
    serializer_class = RoomSerializer
    permission_classes = [AllowAny]
    authentication_classes = []
