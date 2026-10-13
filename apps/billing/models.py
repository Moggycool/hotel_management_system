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
    completed_at = models.DateTimeField(null=True, blank=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.method} - {self.amount} ETB ({self.status})"


class CashierShift(models.Model):
    SHIFT_SLOTS = [
        ('Morning Shift (06:00 - 14:00)', 'Morning Shift (06:00 - 14:00)'),
        ('Afternoon Shift (14:00 - 22:00)', 'Afternoon Shift (14:00 - 22:00)'),
        ('Night Audit Shift (22:00 - 06:00)', 'Night Audit Shift (22:00 - 06:00)'),
    ]
    STATUSES = [
        ('OPEN', 'Open'),
        ('CLOSED', 'Closed'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    business_date = models.DateField(default=timezone.localdate, db_index=True)
    shift_name = models.CharField(max_length=50, choices=SHIFT_SLOTS)
    cashier = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='cashier_shifts')
    cashier_name = models.CharField(max_length=150)
    cashier_role = models.CharField(max_length=50)
    opening_float = models.DecimalField(max_digits=12, decimal_places=2)
    cash_collected = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal('0.00'))
    telebirr_collected = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal('0.00'))
    cbe_card_collected = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal('0.00'))
    bank_transfer_collected = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal('0.00'))
    actual_closing_cash = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True)
    discrepancy = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True)
    status = models.CharField(
        max_length=10, choices=STATUSES, default='OPEN', db_index=True)
    opened_at = models.DateTimeField(default=timezone.now)
    closed_at = models.DateTimeField(null=True, blank=True)
    closed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='closed_cashier_shifts')
    handover_notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-opened_at']
        constraints = [
            models.UniqueConstraint(
                fields=['business_date', 'shift_name'],
                name='unique_cashier_shift_slot_per_business_date',
            ),
        ]

    def __str__(self):
        return f'{self.business_date} {self.shift_name} - {self.cashier_name} ({self.status})'
