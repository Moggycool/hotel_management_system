import uuid

from django.conf import settings
from django.db import models
from django.core.validators import MaxValueValidator, MinValueValidator
from django.utils import timezone


class GuestFeedback(models.Model):
    CATEGORIES = [
        ('STAY', 'Stay experience'),
        ('ROOM', 'Room and facilities'),
        ('DINING', 'Dining'),
        ('SERVICE', 'Staff service'),
        ('OTHER', 'Other'),
    ]
    STATUSES = [
        ('NEW', 'New'),
        ('REVIEWING', 'Reviewing'),
        ('RESOLVED', 'Resolved'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    rating = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)])
    category = models.CharField(
        max_length=12, choices=CATEGORIES, default='STAY')
    message = models.TextField(max_length=4000)
    guest_name = models.CharField(max_length=150, blank=True)
    reservation_code = models.CharField(
        max_length=30, blank=True, db_index=True)
    submitted_at = models.DateTimeField(default=timezone.now, db_index=True)
    status = models.CharField(
        max_length=12, choices=STATUSES, default='NEW', db_index=True)
    staff_notes = models.TextField(blank=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='reviewed_guest_feedback',
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-submitted_at']

    def __str__(self):
        return f'{self.get_category_display()} ({self.rating}/5) - {self.submitted_at:%Y-%m-%d}'
