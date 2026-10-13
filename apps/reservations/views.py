from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone

from apps.reservations.models import Reservation, RoomHold
from apps.reservations.serializers import ReservationSerializer, RoomHoldSerializer
from apps.rooms.models import Room, RoomStatus
from apps.housekeeping.models import HousekeepingTask
from apps.accounts.permissions import IsFrontOfficeStaff
from apps.audit.mixins import AuditedModelViewSetMixin
from apps.audit.models import AuditModule
from apps.audit.services import log_audit_event


class ReservationViewSet(AuditedModelViewSetMixin, viewsets.ModelViewSet):
    http_method_names = ['get', 'post', 'put', 'patch', 'head', 'options']
    queryset = Reservation.objects.select_related(
        'guest', 'room', 'rate_plan').all()
    serializer_class = ReservationSerializer
    audit_module = AuditModule.RESERVATION
    audit_name = 'RESERVATION'
    audit_create_action = 'RESERVATION_UPSERTED'
    audit_fields = ('id', 'confirmation_code', 'status',
                    'room_id', 'check_in_date', 'check_out_date')

    def get_permissions(self):
        if self.action == 'health_check':
            permission_class = AllowAny
        elif self.action in ['list', 'retrieve']:
            permission_class = IsAuthenticated
        else:
            permission_class = IsFrontOfficeStaff
        return [permission_class()]

    @action(detail=False, methods=['get'], url_path='health')
    def health_check(self, request):
        """Diagnostic health check endpoint for React front desk client."""
        return Response({
            'status': 'online',
            'database': 'django_sqlite3',
            'reservation_count': Reservation.objects.count(),
            'message': 'Django REST Reservations API is online and operational.'
        })

    @action(detail=False, methods=['post'], url_path='check-in')
    def check_in(self, request):
        confirmation_code = request.data.get('confirmation_code')
        if not confirmation_code:
            return Response({'error': 'confirmation_code is required.'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            reservation = get_object_or_404(
                Reservation.objects.select_for_update().select_related('room'),
                confirmation_code=confirmation_code,
            )
            if reservation.status != 'CONFIRMED':
                return Response({'error': 'Only confirmed reservations can be checked in.'}, status=status.HTTP_409_CONFLICT)
            if reservation.check_in_date > timezone.localdate():
                return Response({'error': 'The reservation arrival date has not been reached.'}, status=status.HTTP_400_BAD_REQUEST)

            room = Room.objects.select_for_update().get(pk=reservation.room_id)
            if room.status != RoomStatus.VACANT_CLEAN or room.housekeeping_status != 'CLEAN':
                return Response({'error': 'The assigned room is not clean and available for check-in.'}, status=status.HTTP_409_CONFLICT)
            if Reservation.objects.filter(room=room, status='CHECKED_IN').exclude(pk=reservation.pk).exists():
                return Response({'error': 'Another checked-in reservation already occupies this room.'}, status=status.HTTP_409_CONFLICT)

            reservation.status = 'CHECKED_IN'
            reservation.actual_check_in_time = timezone.now()
            reservation.save(
                update_fields=['status', 'actual_check_in_time', 'updated_at'])
            room.status = RoomStatus.OCCUPIED
            room.save(update_fields=['status'])
            log_audit_event(
                module=AuditModule.RESERVATION,
                action='RESERVATION_CHECKED_IN',
                details=f'Reservation {reservation.confirmation_code} checked in to room {room.room_number}.',
                request=request,
                before_state={'reservation_status': 'CONFIRMED',
                              'room_status': RoomStatus.VACANT_CLEAN},
                after_state={'reservation_status': reservation.status,
                             'room_status': room.status},
            )

        return Response(ReservationSerializer(reservation).data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], url_path='check-out')
    def check_out(self, request):
        confirmation_code = request.data.get('confirmation_code')
        if not confirmation_code:
            return Response({'error': 'confirmation_code is required.'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            reservation = get_object_or_404(
                Reservation.objects.select_for_update().select_related('room'),
                confirmation_code=confirmation_code,
            )
            if reservation.status != 'CHECKED_IN':
                return Response({'error': 'Only checked-in reservations can be checked out.'}, status=status.HTTP_409_CONFLICT)

            room = Room.objects.select_for_update().get(pk=reservation.room_id)
            reservation.status = 'CHECKED_OUT'
            reservation.actual_check_out_time = timezone.now()
            reservation.save(
                update_fields=['status', 'actual_check_out_time', 'updated_at'])
            room.status = RoomStatus.VACANT_DIRTY
            room.housekeeping_status = 'DIRTY'
            room.save(update_fields=['status', 'housekeeping_status'])
            HousekeepingTask.objects.create(
                room=room,
                task_type='CHECKOUT_CLEAN',
                status='PENDING',
                priority='HIGH',
                notes=f'Checkout cleaning for reservation {reservation.confirmation_code}.',
            )
            log_audit_event(
                module=AuditModule.RESERVATION,
                action='RESERVATION_CHECKED_OUT',
                details=f'Reservation {reservation.confirmation_code} checked out; room {room.room_number} queued for cleaning.',
                request=request,
                before_state={'reservation_status': 'CHECKED_IN',
                              'room_status': RoomStatus.OCCUPIED},
                after_state={'reservation_status': reservation.status,
                             'room_status': room.status},
            )

        return Response(ReservationSerializer(reservation).data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], url_path='cancel')
    def cancel_reservation(self, request):
        confirmation_code = request.data.get('confirmation_code')
        if not confirmation_code:
            return Response({'error': 'confirmation_code is required.'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            reservation = get_object_or_404(
                Reservation.objects.select_for_update(),
                confirmation_code=confirmation_code,
            )
            if reservation.status != 'CONFIRMED':
                return Response({'error': 'Only confirmed reservations can be cancelled.'}, status=status.HTTP_409_CONFLICT)
            reservation.status = 'CANCELLED'
            reservation.save(update_fields=['status', 'updated_at'])
            log_audit_event(
                module=AuditModule.RESERVATION,
                action='RESERVATION_CANCELLED',
                details=f'Reservation {reservation.confirmation_code} cancelled.',
                request=request,
                before_state={'status': 'CONFIRMED'},
                after_state={'status': reservation.status},
            )

        return Response(ReservationSerializer(reservation).data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], url_path='no-show')
    def mark_no_show(self, request):
        confirmation_code = request.data.get('confirmation_code')
        if not confirmation_code:
            return Response({'error': 'confirmation_code is required.'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            reservation = get_object_or_404(
                Reservation.objects.select_for_update(),
                confirmation_code=confirmation_code,
            )
            if reservation.status != 'CONFIRMED':
                return Response({'error': 'Only confirmed reservations can be marked as no-show.'}, status=status.HTTP_409_CONFLICT)
            if reservation.check_in_date > timezone.localdate():
                return Response({'error': 'A future arrival cannot be marked as a no-show.'}, status=status.HTTP_400_BAD_REQUEST)
            reservation.status = 'NO_SHOW'
            reservation.save(update_fields=['status', 'updated_at'])
            log_audit_event(
                module=AuditModule.RESERVATION,
                action='RESERVATION_MARKED_NO_SHOW',
                details=f'Reservation {reservation.confirmation_code} marked no-show.',
                request=request,
                before_state={'status': 'CONFIRMED'},
                after_state={'status': reservation.status},
            )

        return Response(ReservationSerializer(reservation).data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], url_path='bulk-sync')
    def bulk_sync(self, request):
        """
        Accepts a list of reservations from the Front Desk React app
        and upserts each one into the Django PostgreSQL/SQLite database.
        """
        raw_items = request.data
        if isinstance(raw_items, dict) and 'reservations' in raw_items:
            raw_items = raw_items['reservations']
        elif not isinstance(raw_items, list):
            raw_items = [raw_items]

        synced_records = []
        errors = []

        for item in raw_items:
            serializer = ReservationSerializer(data=item)
            if serializer.is_valid():
                try:
                    res_instance = serializer.save()
                    synced_records.append(
                        ReservationSerializer(res_instance).data)
                except Exception as ex:
                    errors.append(
                        {'item': item.get('confirmation_code', 'unknown'), 'error': str(ex)})
            else:
                errors.append(
                    {'item': item.get('confirmation_code', 'unknown'), 'errors': serializer.errors})

        return Response({
            'success': len(errors) == 0,
            'total_received': len(raw_items),
            'synced_count': len(synced_records),
            'database_total': Reservation.objects.count(),
            'errors': errors,
            'synced_reservations': synced_records,
        }, status=status.HTTP_200_OK if len(synced_records) > 0 else (
            status.HTTP_200_OK if len(
                raw_items) == 0 else status.HTTP_400_BAD_REQUEST
        ))


class RoomHoldViewSet(AuditedModelViewSetMixin, viewsets.ModelViewSet):
    queryset = RoomHold.objects.select_related('room').all()
    serializer_class = RoomHoldSerializer
    permission_classes = [IsFrontOfficeStaff]
    audit_module = AuditModule.RESERVATION
    audit_name = 'ROOM_HOLD'
    audit_fields = ('id', 'room_id', 'check_in_date', 'check_out_date')
