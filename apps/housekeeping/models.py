import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone
from core.models import Room


class HousekeepingTask(models.Model):
    TASK_TYPE_CHOICES = [
        ('CHECKOUT_CLEAN', 'Checkout Deep Clean'),
        ('STAYOVER_REFRESH', 'Stayover Daily Refresh'),
        ('INSPECTION', 'Supervisor Quality Inspection'),
        ('LINEN_CHANGE', 'Bed Linen & Towel Replacement'),
        ('DEEP_CLEAN', 'Periodic Deep Sanitization'),
    ]
    STATUS_CHOICES = [
        ('PENDING', 'Pending Assignment'),
        ('IN_PROGRESS', 'Cleaning In Progress'),
        ('INSPECTION_REQUIRED', 'Inspection Required'),
        ('COMPLETED', 'Cleaned & Ready'),
        ('MAINTENANCE_REQUIRED', 'Issue Flagged for Maintenance'),
    ]
    PRIORITY_CHOICES = [
        ('LOW', 'Low Priority'),
        ('NORMAL', 'Standard Turnover'),
        ('HIGH', 'Urgent / VIP Arrival Today'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    room = models.ForeignKey(
        Room, on_delete=models.CASCADE, related_name="housekeeping_tasks")
    task_type = models.CharField(
        max_length=30, choices=TASK_TYPE_CHOICES, default='CHECKOUT_CLEAN')
    status = models.CharField(
        max_length=30, choices=STATUS_CHOICES, default='PENDING')
    priority = models.CharField(
        max_length=20, choices=PRIORITY_CHOICES, default='NORMAL')
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_housekeeping_tasks"
    )
    notes = models.TextField(blank=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    inspected_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="inspected_housekeeping_tasks"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-priority', '-created_at']

    def mark_in_progress(self, user=None):
        self.status = 'IN_PROGRESS'
        self.started_at = timezone.now()
        if user:
            self.assigned_to = user
        self.save()
        # Synchronize Room state
        self.room.housekeeping_status = 'CLEANING'
        self.room.save()

    def mark_completed(self, user=None):
        self.status = 'INSPECTION_REQUIRED'
        self.completed_at = timezone.now()
        self.save()
        self.room.housekeeping_status = 'INSPECTION_REQUIRED'
        self.room.save()

    def pass_inspection(self, supervisor=None):
        self.status = 'COMPLETED'
        self.inspected_by = supervisor
        self.save()
        self.room.housekeeping_status = 'VACANT_CLEAN'
        self.room.status = 'AVAILABLE'
        self.room.save()

    def __str__(self):
        return f"Room {self.room.room_number} - {self.get_task_type_display()} ({self.status})"
