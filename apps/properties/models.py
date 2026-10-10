import uuid
from decimal import Decimal
from django.db import models
from django.utils import timezone


class Property(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField('Property Name', max_length=150,
                            default='Arbaminch Tourist Hotel')
    name_amharic = models.CharField(
        'Name (Amharic)', max_length=150, default='አርባ ምንጭ ቱሪስት ሆቴል')
    tagline = models.CharField(
        max_length=255, default='Premier Rift Valley Hospitality & Lake Chamo Retreat')
    address = models.CharField(
        max_length=255, default='Shecha District, Arba Minch, Gamo Zone, South Ethiopia')
    phone = models.CharField(max_length=30, default='+251 46 881 2293')
    email = models.EmailField(default='frontdesk@arbaminchtouristhotel.et')

    # Ethiopian Taxation
    tin_number = models.CharField(
        'TIN Number', max_length=20, default='0062819401')
    vat_rate = models.DecimalField(
        'VAT Rate', max_digits=5, decimal_places=4, default=Decimal('0.1500'))
    service_charge_rate = models.DecimalField(
        'Service Charge', max_digits=5, decimal_places=4, default=Decimal('0.1000'))
    currency = models.CharField('Currency', max_length=5, default='ETB')

    # Telebirr Settings
    telebirr_short_code = models.CharField(max_length=20, default='194022')
    telebirr_merchant_id = models.CharField(
        max_length=50, default='ETH-TEL-ARB-904')

    # Hotel Operations
    check_in_time = models.TimeField(default='14:00:00')
    check_out_time = models.TimeField(default='11:00:00')
    current_business_date = models.DateField(default=timezone.now)
    timezone_name = models.CharField(
        max_length=50, default='Africa/Addis_Ababa')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Property Configuration'
        verbose_name_plural = 'Property Configurations'

    def __str__(self):
        return f"{self.name} (TIN: {self.tin_number})"
