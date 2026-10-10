from django.contrib import admin
from apps.properties.models import Property


@admin.register(Property)
class PropertyAdmin(admin.ModelAdmin):
    list_display = ('name', 'tin_number', 'currency', 'vat_rate',
                    'service_charge_rate', 'current_business_date')
    readonly_fields = ('created_at', 'updated_at')

    fieldsets = (
        ('Property Identity', {
            'fields': ('name', 'name_amharic', 'tagline', 'address', 'phone', 'email')
        }),
        ('Ethiopian Taxation & Currency', {
            'fields': ('tin_number', 'currency', 'vat_rate', 'service_charge_rate')
        }),
        ('Telebirr Merchant Integration', {
            'fields': ('telebirr_short_code', 'telebirr_merchant_id')
        }),
        ('Operational Policies', {
            'fields': ('check_in_time', 'check_out_time', 'current_business_date', 'timezone_name', 'created_at', 'updated_at')
        }),
    )
