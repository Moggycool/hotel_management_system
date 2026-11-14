from datetime import date
from django.utils import timezone
from apps.rooms.models import Room, RoomStatus
from apps.reservations.models import Reservation, ReservationStatus, RoomHold


class AvailabilityEngine:
    @staticmethod
    def get_available_rooms(
        check_in: date,
        check_out: date,
        room_type_id=None,
        exclude_reservation_id=None,
        allow_uninspected=False,
    ):
        if check_in >= check_out:
            raise ValueError(
                "Check-out date must be strictly after check-in date.")

        # Find rooms with overlapping active reservations
        overlapping_reservations = Reservation.objects.filter(
            status__in=[ReservationStatus.CONFIRMED,
                        ReservationStatus.CHECKED_IN],
            check_in_date__lt=check_out,
            check_out_date__gt=check_in,
        )
        if exclude_reservation_id:
            overlapping_reservations = overlapping_reservations.exclude(
                pk=exclude_reservation_id)
        overlapping_res = overlapping_reservations.values_list(
            'room_id', flat=True)

        # Find rooms currently in active hold (online hold timeout 15 mins)
        active_holds = RoomHold.objects.filter(
            expires_at__gt=timezone.now(),
            check_in_date__lt=check_out,
            check_out_date__gt=check_in,
        ).values_list('room_id', flat=True)

        # Assignment requires a vacant room that housekeeping has inspected.
        unavailable_room_ids = set(list(overlapping_res) + list(active_holds))

        queryset = Room.objects.filter(
            is_active=True,
            out_of_order_requested_by__isnull=True,
        )
        if allow_uninspected:
            queryset = queryset.filter(status__in=[
                RoomStatus.VACANT_CLEAN,
                RoomStatus.VACANT_DIRTY,
            ])
        else:
            queryset = queryset.filter(
                status=RoomStatus.VACANT_CLEAN,
                housekeeping_status='CLEAN',
            )
        queryset = queryset.exclude(
            id__in=unavailable_room_ids).select_related('room_type')

        if room_type_id:
            queryset = queryset.filter(room_type_id=room_type_id)

        return queryset
