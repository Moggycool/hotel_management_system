import uuid
from decimal import Decimal

from django.conf import settings
from django.db import models
from django.utils import timezone


class RestaurantMenuItem(models.Model):
    CATEGORIES = [
        ('TRADITIONAL', 'Traditional'),
        ('GRILL_MAINS', 'Grill / Mains'),
        ('FASTING_VEGAN', 'Fasting / Vegan'),
        ('BEVERAGES', 'Beverages'),
        ('BREAKFAST', 'Breakfast'),
        ('DESSERTS', 'Desserts'),
    ]
    STATIONS = [
        ('HOT_KITCHEN', 'Hot Kitchen'),
        ('COLD_SALAD', 'Cold Salad'),
        ('BAR_BEVERAGE', 'Bar / Beverage'),
        ('BAKERY_DESSERT', 'Bakery / Dessert'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    client_id = models.CharField(max_length=80, unique=True, blank=True)
    code = models.CharField(max_length=20, unique=True)
    name = models.CharField(max_length=150)
    name_amharic = models.CharField(max_length=150, blank=True)
    description = models.TextField(blank=True)
    category = models.CharField(max_length=20, choices=CATEGORIES)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    station = models.CharField(max_length=20, choices=STATIONS)
    is_fasting = models.BooleanField(default=False)
    is_spicy = models.BooleanField(default=False)
    is_vegetarian = models.BooleanField(default=False)
    preparation_minutes = models.PositiveSmallIntegerField(default=10)
    is_available = models.BooleanField(default=True, db_index=True)
    image_url = models.URLField(blank=True)

    class Meta:
        ordering = ['category', 'name']

    def __str__(self):
        return f'{self.code} - {self.name} ({self.price} ETB)'


class RestaurantOrder(models.Model):
    ORDER_TYPES = [
        ('DINE_IN', 'Dine In'),
        ('ROOM_SERVICE', 'Room Service'),
        ('TAKEAWAY', 'Takeaway'),
        ('BAR_WALKIN', 'Bar Walk-in'),
    ]
    STATUSES = [
        ('OPEN', 'Open'),
        ('SENT_TO_KITCHEN', 'Sent to Kitchen'),
        ('IN_PREPARATION', 'In Preparation'),
        ('READY', 'Ready'),
        ('SERVED', 'Served'),
        ('SETTLED', 'Settled'),
        ('POSTED_TO_ROOM', 'Posted to Room'),
        ('VOIDED', 'Voided'),
    ]
    PAYMENT_METHODS = [
        ('TELEBIRR', 'Telebirr'),
        ('CBE_BIRR', 'CBE Birr'),
        ('CASH', 'Cash'),
        ('CARD', 'Card'),
        ('BANK_TRANSFER', 'Bank Transfer'),
        ('ROOM_CHARGE', 'Room Charge'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order_number = models.CharField(max_length=30, unique=True, db_index=True)
    kot_number = models.CharField(max_length=30, unique=True)
    order_type = models.CharField(max_length=20, choices=ORDER_TYPES)
    outlet = models.CharField(max_length=100)
    table_number = models.CharField(max_length=20, blank=True)
    room_number = models.CharField(max_length=10, blank=True)
    reservation = models.ForeignKey(
        'reservations.Reservation', null=True, blank=True,
        on_delete=models.PROTECT, related_name='restaurant_orders')
    guest_name = models.CharField(max_length=150, blank=True)
    waiter = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='restaurant_orders')
    waiter_name = models.CharField(max_length=150, blank=True)
    covers = models.PositiveSmallIntegerField(default=1)
    subtotal = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal('0.00'))
    service_charge = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal('0.00'))
    vat_amount = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal('0.00'))
    grand_total = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal('0.00'))
    status = models.CharField(
        max_length=20, choices=STATUSES, default='OPEN', db_index=True)
    payment_method = models.CharField(
        max_length=20, choices=PAYMENT_METHODS, blank=True)
    payment_reference = models.CharField(max_length=100, blank=True)
    telebirr_transaction_id = models.CharField(max_length=100, blank=True)
    void_reason = models.TextField(blank=True)
    special_instructions = models.TextField(blank=True)
    created_at = models.DateTimeField(default=timezone.now, db_index=True)
    kot_sent_at = models.DateTimeField(null=True, blank=True)
    settled_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.order_number} ({self.status})'


class RestaurantOrderItem(models.Model):
    STATUSES = [
        ('QUEUED', 'Queued'),
        ('PREPARING', 'Preparing'),
        ('READY', 'Ready'),
        ('SERVED', 'Served'),
        ('CANCELLED', 'Cancelled'),
    ]
    STATIONS = [
        ('HOT_KITCHEN', 'Hot Kitchen'),
        ('COLD_SALAD', 'Cold Salad'),
        ('BAR_BEVERAGE', 'Bar / Beverage'),
        ('BAKERY_DESSERT', 'Bakery / Dessert'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.ForeignKey(
        RestaurantOrder, on_delete=models.CASCADE, related_name='items')
    menu_item_id = models.CharField(max_length=80, blank=True)
    name = models.CharField(max_length=150)
    name_amharic = models.CharField(max_length=150, blank=True)
    quantity = models.PositiveSmallIntegerField()
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    station = models.CharField(max_length=20, choices=STATIONS)
    notes = models.TextField(blank=True)
    status = models.CharField(
        max_length=12, choices=STATUSES, default='QUEUED')

    def __str__(self):
        return f'{self.quantity}x {self.name} ({self.status})'
