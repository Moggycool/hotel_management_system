import uuid
from decimal import Decimal
from django.db import models
from django.conf import settings
from django.utils import timezone
from apps.guests.models import Guest
from apps.reservations.models import Reservation
from apps.rooms.models import Room


class Folio(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reservation = models.OneToOneField(
        Reservation, on_delete=models.CASCADE, related_name="folio")
    guest = models.ForeignKey(
        Guest, on_delete=models.PROTECT, related_name="folios")
    is_closed = models.BooleanField(default=False)
    closed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def total_charges(self) -> Decimal:
        return self.items.aggregate(total=models.Sum('amount'))['total'] or Decimal('0.00')

    @property
    def total_payments(self) -> Decimal:
        return self.payments.filter(status='COMPLETED').aggregate(total=models.Sum('amount'))['total'] or Decimal('0.00')

    @property
    def balance_due(self) -> Decimal:
        return self.total_charges - self.total_payments

    def __str__(self):
        return f"Folio #{str(self.id)[:8]} - {self.guest.full_name} (Bal: {self.balance_due} ETB)"


class FolioItem(models.Model):
    CATEGORY_CHOICES = [
        ('ROOM', 'Room Charge'),
        ('RESTAURANT', 'Restaurant & Bar'),
        ('MINIBAR', 'Minibar & In-room Snacks'),
        ('SPA', 'Spa & Wellness'),
        ('TRANSFER', 'Airport Shuttle / Transport'),
        ('LAUNDRY', 'Laundry & Dry Cleaning'),
        ('MISC', 'Miscellaneous / Incidentals'),
        ('TAX', 'Government Tax (15% VAT)'),
        ('SERVICE_CHARGE', 'Service Charge (10%)'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    folio = models.ForeignKey(
        Folio, on_delete=models.CASCADE, related_name="items")
    category = models.CharField(
        max_length=30, choices=CATEGORY_CHOICES, default='MISC')
    description = models.CharField(max_length=255)
    amount = models.DecimalField(max_digits=12, decimal_places=2)  # In ETB
    reference_id = models.CharField(
        max_length=100, blank=True, null=True, help_text="POS Order ID or Ticket")
    posted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    posted_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['-posted_at']

    def __str__(self):
        return f"{self.category}: {self.description} ({self.amount} ETB)"


class Payment(models.Model):
    METHOD_CHOICES = [
        ('TELEBIRR', 'Telebirr (Ethio telecom)'),
        ('CBE_BIRR', 'CBE Birr'),
        ('BANK_TRANSFER', 'Bank Transfer (CBE / Awash / Dashen)'),
        ('CARD', 'Credit / Debit Card (Visa, Mastercard)'),
        ('CASH', 'Cash (ETB)'),
    ]
    STATUS_CHOICES = [
        ('PENDING', 'Pending Payment'),
        ('COMPLETED', 'Completed'),
        ('FAILED', 'Failed / Cancelled'),
        ('REFUNDED', 'Refunded'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    folio = models.ForeignKey(
        Folio, on_delete=models.CASCADE, related_name="payments")
    method = models.CharField(
        max_length=30, choices=METHOD_CHOICES, default='TELEBIRR')
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=3, default='ETB')
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default='PENDING')
    telebirr_transaction_id = models.CharField(
        max_length=100, blank=True, null=True, unique=True)
    out_trade_no = models.CharField(max_length=100, unique=True)
    notes = models.TextField(blank=True)
    received_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.method} - {self.amount} ETB ({self.status})"
