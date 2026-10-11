from rest_framework import viewsets
from rest_framework.permissions import AllowAny

from apps.guests.models import Guest
from apps.guests.serializers import GuestSerializer


class GuestViewSet(viewsets.ModelViewSet):
    queryset = Guest.objects.all()
    serializer_class = GuestSerializer
    permission_classes = [AllowAny]
