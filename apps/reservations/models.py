import uuid
from datetime import timedelta
from decimal import Decimal
from django.db import models
from django.utils import timezone
from apps.rooms.models import Room, RoomType, RatePlan


class BookingSource(models.TextChoices):
    WALK_IN = 'WALK_IN', 'Walk-In Front Desk'
    WEBSITE = 'WEBSITE', 'Hotel Website Direct'
    PHONE = 'PHONE', 'Phone / Direct Inquiry'
    CORPORATE = 'CORPORATE', 'Corporate / NGO Account'
    AGENT = 'AGENT', 'Travel Agent / Tour Operator'


class ReservationStatus(models.TextChoices):
    DRAFT = 'DRAFT', 'Draft'
    PAYMENT_PENDING = 'PAYMENT_PENDING', 'Payment Pending (Hold)'
    CONFIRMED = 'CONFIRMED', 'Confirmed'
    CHECKED_IN = 'CHECKED_IN', 'Checked In'
    CHECKED_OUT = 'CHECKED_OUT', 'Checked Out'
    CANCELLED = 'CANCELLED', 'Cancelled'
    NO_SHOW = 'NO_SHOW', 'No Show'


class Reservation(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    confirmation_code = models.CharField(
        max_length=20, unique=True, db_index=True)
    guest = models.ForeignKey(
        'guests.Guest', on_delete=models.PROTECT, related_name='reservations')
    room = models.ForeignKey(
        Room, on_delete=models.PROTECT, related_name='reservations')
    rate_plan = models.ForeignKey(RatePlan, on_delete=models.PROTECT)

    check_in_date = models.DateField(db_index=True)
    check_out_date = models.DateField(db_index=True)
    adults = models.PositiveSmallIntegerField(default=1)
    children = models.PositiveSmallIntegerField(default=0)

    source = models.CharField(
        max_length=20, choices=BookingSource.choices, default=BookingSource.WALK_IN)
    status = models.CharField(
        max_length=20,
        choices=ReservationStatus.choices,
        default=ReservationStatus.CONFIRMED,
        db_index=True,
    )

    # Financial Snapshot in ETB
    room_rate_total_etb = models.DecimalField(max_digits=12, decimal_places=2)
    service_charge_etb = models.DecimalField(
        max_digits=12, decimal_places=2)  # 10%
    vat_etb = models.DecimalField(
        max_digits=12, decimal_places=2)             # 15%
    grand_total_etb = models.DecimalField(max_digits=12, decimal_places=2)
    deposit_paid_etb = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal('0.00'))

    special_requests = models.TextField(blank=True)
    actual_check_in_time = models.DateTimeField(null=True, blank=True)
    actual_check_out_time = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def nights(self):
        return max(1, (self.check_out_date - self.check_in_date).days)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.confirmation_code} - Room {self.room.room_number} ({self.guest.full_name})"


class RoomHold(models.Model):
    """Temporary 15-minute hold during Telebirr payment processing."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    room = models.ForeignKey(Room, on_delete=models.CASCADE)
    check_in_date = models.DateField()
    check_out_date = models.DateField()
    hold_token = models.CharField(max_length=64, unique=True)
    expires_at = models.DateTimeField(db_index=True)

    def is_active(self):
        return timezone.now() < self.expires_at
