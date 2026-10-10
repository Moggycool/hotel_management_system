import uuid
from decimal import Decimal
from django.db import models
from django.core.validators import MinValueValidator
from django.utils import timezone


class Property(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200, default="Arbaminch Tourist Hotel")
    name_amharic = models.CharField(
        max_length=200, blank=True, default="አርባምንጭ ቱሪስት ሆቴል")
    currency = models.CharField(max_length=10, default="ETB")
    tin_number = models.CharField(
        max_length=50, blank=True, help_text="Ethiopian TIN Number")
    telebirr_merchant_id = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = "Properties"

    def __str__(self):
        return self.name


class Room(models.Model):
    ROOM_TYPE_CHOICES = [
        ('Standard King', 'Standard King'),
        ('Deluxe Ocean View', 'Deluxe Ocean / Lake View'),
        ('Executive Suite', 'Executive Suite'),
        ('Presidential Penthouse', 'Presidential Penthouse'),
        ('Garden Villa', 'Garden Villa'),
        ('Family Suite', 'Family Suite'),
    ]

    ROOM_STATUS_CHOICES = [
        ('available', 'Available'),
        ('occupied', 'Occupied'),
        ('reserved', 'Reserved'),
        ('cleaning', 'Cleaning'),
        ('maintenance', 'Maintenance / Out of Order'),
    ]

    HOUSEKEEPING_CHOICES = [
        ('clean', 'Clean'),
        ('dirty', 'Dirty'),
        ('in_progress', 'Cleaning In Progress'),
        ('inspection_needed', 'Inspection Needed'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    property = models.ForeignKey(
        Property, on_delete=models.CASCADE, related_name='rooms', null=True, blank=True)
    room_number = models.CharField(max_length=20, unique=True)
    floor = models.PositiveSmallIntegerField(default=1)
    type = models.CharField(
        max_length=50, choices=ROOM_TYPE_CHOICES, default='Standard King')
    price_per_night = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal('2500.00'), help_text="ETB")
    capacity = models.PositiveSmallIntegerField(default=2)
    bed_type = models.CharField(max_length=100, default="1 King Bed")
    status = models.CharField(
        max_length=20, choices=ROOM_STATUS_CHOICES, default='available')
    housekeeping_status = models.CharField(
        max_length=30, choices=HOUSEKEEPING_CHOICES, default='clean')
    notes = models.TextField(blank=True)

    def __str__(self):
        return f"Room {self.room_number} - {self.type} ({self.status})"


class Guest(models.Model):
    ID_TYPE_CHOICES = [
        ('fayda', 'National ID (Fayda / ፋይዳ)'),
        ('kebele', 'Kebele ID'),
        ('passport', 'Passport'),
        ('drivers_license', 'Driver’s License'),
    ]

    VIP_TIERS = [
        ('Regular', 'Regular'),
        ('Silver', 'Silver'),
        ('Gold', 'Gold'),
        ('Platinum', 'Platinum VIP'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    full_name = models.CharField(max_length=255)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=50, help_text="+251-9...")
    id_type = models.CharField(
        max_length=30, choices=ID_TYPE_CHOICES, default='fayda')
    id_number = models.CharField(max_length=100, blank=True)
    nationality = models.CharField(max_length=100, default="Ethiopian")
    vip_tier = models.CharField(
        max_length=20, choices=VIP_TIERS, default='Regular')
    total_stays = models.PositiveIntegerField(default=0)
    special_preferences = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.full_name} ({self.phone})"


class Reservation(models.Model):
    STATUS_CHOICES = [
        ('confirmed', 'Confirmed'),
        ('checked_in', 'Checked In'),
        ('checked_out', 'Checked Out'),
        ('cancelled', 'Cancelled'),
    ]

    SOURCE_CHOICES = [
        ('walk_in', 'Front Desk Walk-In'),
        ('website', 'Public Website Engine'),
        ('phone', 'Phone Booking'),
        ('corporate', 'Corporate Partner'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    confirmation_code = models.CharField(max_length=30, unique=True)
    guest = models.ForeignKey(
        Guest, on_delete=models.PROTECT, related_name='reservations')
    room = models.ForeignKey(
        Room, on_delete=models.PROTECT, related_name='reservations')

    check_in_date = models.DateField()
    check_out_date = models.DateField()
    adults = models.PositiveSmallIntegerField(default=1)
    children = models.PositiveSmallIntegerField(default=0)

    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default='confirmed')
    source = models.CharField(
        max_length=20, choices=SOURCE_CHOICES, default='walk_in')
    rate_plan_name = models.CharField(
        max_length=100, default="Standard Flexible")

    # Financial fields in Ethiopian Birr (ETB)
    room_rate_total = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal('0.00'))
    vat_total = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal('0.00'), help_text="15% VAT")
    service_charge_total = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal('0.00'), help_text="10% Service Charge")
    grand_total = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal('0.00'))
    amount_paid = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal('0.00'))

    payment_method = models.CharField(max_length=50, default='telebirr')
    telebirr_reference = models.CharField(max_length=100, blank=True)
    special_requests = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    @property
    def balance_due(self):
        return max(Decimal('0.00'), self.grand_total - self.amount_paid)

    def __str__(self):
        return f"{self.confirmation_code} - {self.guest.full_name} ({self.room.room_number})"
