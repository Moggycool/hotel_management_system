import uuid
from decimal import Decimal
from django.conf import settings
from django.db import models


class RoomStatus(models.TextChoices):
    VACANT_CLEAN = 'VACANT_CLEAN', 'Vacant Clean (Sellable)'
    VACANT_DIRTY = 'VACANT_DIRTY', 'Vacant Dirty (Turnover Queue)'
    OCCUPIED = 'OCCUPIED', 'Occupied'
    MAINTENANCE = 'MAINTENANCE', 'Under Maintenance / Out of Order'
    OUT_OF_SERVICE = 'OUT_OF_SERVICE', 'Out of Service'
    OUT_OF_ORDER = 'OUT_OF_ORDER', 'Out of Order'
    BLOCKED = 'BLOCKED', 'Blocked'


class RoomType(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)
    name_amharic = models.CharField(max_length=100, blank=True)
    description = models.TextField()
    base_price_etb = models.DecimalField(max_digits=12, decimal_places=2)
    max_adults = models.PositiveSmallIntegerField(default=2)
    max_children = models.PositiveSmallIntegerField(default=1)
    bed_type = models.CharField(max_length=50, default='1 King Bed')
    size_sqm = models.PositiveSmallIntegerField(default=35)
    photo = models.ImageField(upload_to='room-types/', blank=True)
    # e.g. ["Wi-Fi", "Lake Chamo View", "AC"]
    amenities = models.JSONField(default=list)

    class Meta:
        ordering = ['base_price_etb']

    def __str__(self):
        return f"{self.name} ({self.base_price_etb:,.2f} ETB)"


class Room(models.Model):
    HOUSEKEEPING_STATUS_CHOICES = [
        ('CLEAN', 'Clean'),
        ('DIRTY', 'Dirty'),
        ('IN_PROGRESS', 'In Progress'),
        ('INSPECTION_REQUIRED', 'Inspection Required'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    room_number = models.CharField(max_length=10, unique=True, db_index=True)
    room_type = models.ForeignKey(
        RoomType, on_delete=models.PROTECT, related_name='rooms')
    floor = models.PositiveSmallIntegerField(default=1)
    wing = models.CharField(max_length=50, blank=True)
    status = models.CharField(
        max_length=20,
        choices=RoomStatus.choices,
        default=RoomStatus.VACANT_CLEAN,
        db_index=True,
    )
    housekeeping_status = models.CharField(
        max_length=30,
        choices=HOUSEKEEPING_STATUS_CHOICES,
        default='CLEAN',
        db_index=True,
    )
    status_reason = models.TextField(blank=True)
    expected_return_date = models.DateField(null=True, blank=True)
    out_of_order_ticket = models.ForeignKey(
        'housekeeping.MaintenanceTicket',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='out_of_order_rooms',
    )
    out_of_order_requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='requested_out_of_order_rooms',
    )
    out_of_order_confirmed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='confirmed_out_of_order_rooms',
    )
    is_active = models.BooleanField(default=True)
    notes = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ['room_number']

    def __str__(self):
        return f"Room {self.room_number} - {self.room_type.name} [{self.get_status_display()}]"


class RatePlan(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)
    multiplier = models.DecimalField(
        max_digits=4, decimal_places=2, default=Decimal('1.00'))
    fixed_surcharge_etb = models.DecimalField(
        max_digits=10, decimal_places=2, default=Decimal('0.00'))
    description = models.CharField(max_length=255)
    is_resident_only = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)

    def calculate_nightly_rate(self, base_rate: Decimal) -> Decimal:
        return (base_rate * self.multiplier) + self.fixed_surcharge_etb

    def __str__(self):
        return self.name


class RatePlanProposal(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending Approval'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    target_rate_plan = models.ForeignKey(
        RatePlan, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='change_proposals',
    )
    name = models.CharField(max_length=100)
    multiplier = models.DecimalField(
        max_digits=4, decimal_places=2, default=Decimal('1.00'))
    fixed_surcharge_etb = models.DecimalField(
        max_digits=10, decimal_places=2, default=Decimal('0.00'))
    description = models.CharField(max_length=255)
    is_resident_only = models.BooleanField(default=False)
    status = models.CharField(
        max_length=12, choices=STATUS_CHOICES, default='PENDING', db_index=True)
    proposed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT,
        related_name='rate_plan_proposals',
    )
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='approved_rate_plan_proposals',
    )
    decision_notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    decided_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.name} ({self.get_status_display()})'
