from django.contrib import admin
from apps.reservations.models import Reservation, RoomHold


@admin.register(Reservation)
class ReservationAdmin(admin.ModelAdmin):
    list_display = ('confirmation_code', 'guest', 'room', 'check_in_date',
                    'check_out_date', 'status', 'source', 'grand_total_etb')
    list_filter = ('status', 'source', 'check_in_date', 'check_out_date')
    search_fields = ('confirmation_code',
                     'guest__full_name', 'room__room_number')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(RoomHold)
class RoomHoldAdmin(admin.ModelAdmin):
    list_display = ('room', 'check_in_date', 'check_out_date', 'expires_at')
