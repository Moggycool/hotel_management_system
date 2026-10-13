import uuid

from django.db import models
from django.utils import timezone


class KitchenTicket(models.Model):
    STATUSES = [
        ('QUEUED', 'Queued'),
        ('IN_PREPARATION', 'In Preparation'),
        ('READY', 'Ready'),
        ('SERVED', 'Served'),
        ('VOIDED', 'Voided'),
    ]
    STATIONS = [
        ('HOT_KITCHEN', 'Hot Kitchen'),
        ('COLD_SALAD', 'Cold Salad'),
        ('BAR_BEVERAGE', 'Bar / Beverage'),
        ('BAKERY_DESSERT', 'Bakery / Dessert'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ticket_number = models.CharField(max_length=30, unique=True, db_index=True)
    order = models.ForeignKey(
        'restaurant.RestaurantOrder', on_delete=models.CASCADE, related_name='kitchen_tickets')
    items = models.ManyToManyField(
        'restaurant.RestaurantOrderItem', related_name='kitchen_tickets')
    station = models.CharField(max_length=20, choices=STATIONS)
    status = models.CharField(
        max_length=20, choices=STATUSES, default='QUEUED', db_index=True)
    created_at = models.DateTimeField(default=timezone.now)
    started_at = models.DateTimeField(null=True, blank=True)
    ready_at = models.DateTimeField(null=True, blank=True)
    served_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f'{self.ticket_number} - {self.get_station_display()} ({self.status})'
