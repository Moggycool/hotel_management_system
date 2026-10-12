from django.contrib import admin
from apps.reporting.models import NightAuditSession


@admin.register(NightAuditSession)
class NightAuditSessionAdmin(admin.ModelAdmin):
    list_display = (
        'business_date',
        'next_business_date',
        'status',
        'occupied_rooms',
        'occupancy_rate',
        'adr_etb',
        'revpar_etb',
        'gross_revenue_etb',
        'closed_by',
        'closed_at',
    )
    list_filter = ('status', 'business_date')
    search_fields = ('business_date', 'closed_by', 'audit_checksum')
    readonly_fields = ('closed_at', 'audit_checksum')
