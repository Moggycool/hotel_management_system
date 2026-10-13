from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils.dateparse import parse_date

from apps.rooms.models import RatePlan, Room, RoomType
from apps.rooms.serializers import RatePlanSerializer, RoomSerializer, RoomTypeSerializer
from apps.rooms.services import AvailabilityEngine
from apps.accounts.permissions import IsFrontOfficeStaff, IsGeneralManager
from apps.audit.mixins import AuditedModelViewSetMixin
from apps.audit.models import AuditModule


class RoomTypeViewSet(AuditedModelViewSetMixin, viewsets.ModelViewSet):
    queryset = RoomType.objects.all()
    serializer_class = RoomTypeSerializer
    audit_module = AuditModule.ROOMS
    audit_name = 'ROOM_TYPE'
    audit_fields = ('id', 'name', 'base_price_etb')

    def get_permissions(self):
        permission_class = IsAuthenticated if self.action in [
            'list', 'retrieve'] else IsGeneralManager
        return [permission_class()]


class RatePlanViewSet(AuditedModelViewSetMixin, viewsets.ModelViewSet):
    queryset = RatePlan.objects.all()
    serializer_class = RatePlanSerializer
    audit_module = AuditModule.ROOMS
    audit_name = 'RATE_PLAN'
    audit_fields = ('id', 'name', 'multiplier', 'is_active')

    def get_permissions(self):
        permission_class = IsAuthenticated if self.action in [
            'list', 'retrieve'] else IsGeneralManager
        return [permission_class()]


class RoomViewSet(AuditedModelViewSetMixin, viewsets.ModelViewSet):
    queryset = Room.objects.select_related('room_type').all()
    serializer_class = RoomSerializer
    audit_module = AuditModule.ROOMS
    audit_name = 'ROOM'
    audit_fields = ('id', 'room_number', 'status', 'housekeeping_status')

    def get_permissions(self):
        permission_class = IsAuthenticated if self.action in [
            'list', 'retrieve', 'availability'] else IsFrontOfficeStaff
        return [permission_class()]

    @action(detail=False, methods=['get'], url_path='availability')
    def availability(self, request):
        check_in = parse_date(request.query_params.get('check_in', ''))
        check_out = parse_date(request.query_params.get('check_out', ''))
        if not check_in or not check_out:
            return Response(
                {'detail': 'Provide valid check_in and check_out dates in YYYY-MM-DD format.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if check_in >= check_out:
            return Response(
                {'detail': 'Check-out must be after check-in.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        available_rooms = AvailabilityEngine.get_available_rooms(
            check_in, check_out)
        return Response(RoomSerializer(available_rooms, many=True).data)
