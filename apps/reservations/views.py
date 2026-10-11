from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny

from apps.reservations.models import Reservation, RoomHold
from apps.reservations.serializers import ReservationSerializer, RoomHoldSerializer


class ReservationViewSet(viewsets.ModelViewSet):
    queryset = Reservation.objects.select_related(
        'guest', 'room', 'rate_plan').all()
    serializer_class = ReservationSerializer
    permission_classes = [AllowAny]
    authentication_classes = []

    @action(detail=False, methods=['get'], url_path='health')
    def health_check(self, request):
        """Diagnostic health check endpoint for React front desk client."""
        return Response({
            'status': 'online',
            'database': 'django_sqlite3',
            'reservation_count': Reservation.objects.count(),
            'message': 'Django REST Reservations API is online and operational.'
        })

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
                    synced_records.append(ReservationSerializer(res_instance).data)
                except Exception as ex:
                    errors.append({'item': item.get('confirmation_code', 'unknown'), 'error': str(ex)})
            else:
                errors.append({'item': item.get('confirmation_code', 'unknown'), 'errors': serializer.errors})

        return Response({
            'success': len(errors) == 0,
            'total_received': len(raw_items),
            'synced_count': len(synced_records),
            'database_total': Reservation.objects.count(),
            'errors': errors,
            'synced_reservations': synced_records,
        }, status=status.HTTP_200_OK if len(synced_records) > 0 else (
            status.HTTP_200_OK if len(raw_items) == 0 else status.HTTP_400_BAD_REQUEST
        ))


class RoomHoldViewSet(viewsets.ModelViewSet):
    queryset = RoomHold.objects.select_related('room').all()
    serializer_class = RoomHoldSerializer
    permission_classes = [AllowAny]
    authentication_classes = []
