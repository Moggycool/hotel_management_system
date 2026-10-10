from django.contrib import admin
from .models import Property, Room, Guest, Reservation


@admin.register(Property)
class PropertyAdmin(admin.ModelAdmin):
    list_display = ('name', 'name_amharic', 'currency',
                    'tin_number', 'telebirr_merchant_id')


@admin.register(Room)
class RoomAdmin(admin.ModelAdmin):
    list_display = ('room_number', 'type', 'floor',
                    'price_per_night', 'status', 'housekeeping_status')
    list_filter = ('status', 'housekeeping_status', 'type', 'floor')
    search_fields = ('room_number',)
    ordering = ('room_number',)


@admin.register(Guest)
class GuestAdmin(admin.ModelAdmin):
    list_display = ('full_name', 'phone', 'email', 'id_type',
                    'id_number', 'vip_tier', 'total_stays')
    search_fields = ('full_name', 'phone', 'email', 'id_number')
    list_filter = ('vip_tier', 'id_type', 'nationality')


@admin.register(Reservation)
class ReservationAdmin(admin.ModelAdmin):
    list_display = (
        'confirmation_code',
        'guest_name',
        'room_number',
        'check_in_date',
        'check_out_date',
        'status',
        'grand_total',
        'amount_paid',
        'payment_method',
    )
    list_filter = ('status', 'source', 'payment_method', 'check_in_date')
    search_fields = ('confirmation_code', 'guest__full_name',
                     'guest__phone', 'room__room_number')
    readonly_fields = ('created_at',)

    def guest_name(self, obj):
        return obj.guest.full_name
    guest_name.short_description = 'Guest'

    def room_number(self, obj):
        return obj.room.room_number
    room_number.short_description = 'Room'
