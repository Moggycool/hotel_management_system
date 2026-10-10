from django.contrib import admin
from apps.guests.models import Guest


@admin.register(Guest)
class GuestAdmin(admin.ModelAdmin):
    list_display = ('full_name', 'phone_number', 'id_type', 'id_number',
                    'nationality', 'vip_tier', 'total_stays', 'total_spent_etb')
    list_filter = ('vip_tier', 'id_type', 'nationality')
    search_fields = ('full_name', 'phone_number', 'id_number', 'email')
    ordering = ('full_name',)
