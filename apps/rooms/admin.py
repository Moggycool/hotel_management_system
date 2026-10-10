from django.contrib import admin
from apps.rooms.models import RoomType, Room, RatePlan


@admin.register(RoomType)
class RoomTypeAdmin(admin.ModelAdmin):
    list_display = ('name', 'name_amharic', 'base_price_etb',
                    'max_adults', 'max_children', 'bed_type')
    search_fields = ('name', 'name_amharic')


@admin.register(Room)
class RoomAdmin(admin.ModelAdmin):
    list_display = ('room_number', 'room_type', 'floor', 'status', 'is_active')
    list_filter = ('status', 'floor', 'room_type', 'is_active')
    search_fields = ('room_number', 'notes')
    ordering = ('room_number',)


@admin.register(RatePlan)
class RatePlanAdmin(admin.ModelAdmin):
    list_display = ('name', 'multiplier', 'fixed_surcharge_etb',
                    'is_resident_only', 'is_active')
    list_filter = ('is_resident_only', 'is_active')
