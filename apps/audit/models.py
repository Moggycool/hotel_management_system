import uuid
from django.db import models


class AuditModule(models.TextChoices):
    SECURITY = 'SECURITY', 'Security & Authentication'
    AUTH = 'AUTH', 'User & Role Management'
    RESERVATION = 'RESERVATION', 'Front Office & Reservations'
    FOLIO = 'FOLIO', 'Billing, Folios & Cashier'
    ROOMS = 'ROOMS', 'Room Inventory & Pricing'
    HOUSEKEEPING = 'HOUSEKEEPING', 'Housekeeping & Facilities'
    INVENTORY = 'INVENTORY', 'Store & Inventory Management'
    NIGHT_AUDIT = 'NIGHT_AUDIT', 'Night Audit & Close'


class AuditSeverity(models.TextChoices):
    INFO = 'INFO', 'Informational'
    WARNING = 'WARNING', 'Warning / Override'
    CRITICAL = 'CRITICAL', 'Critical / Financial Exception'


class AuditLog(models.Model):
    """
    Immutable ledger of all security, authentication, and financial operations.
    Hard deletes and updates are disallowed.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)
    actor_id = models.UUIDField(null=True, blank=True, db_index=True)
    actor_name = models.CharField(max_length=150, default='System')
    actor_role = models.CharField(max_length=50, default='SYSTEM')
    module = models.CharField(
        max_length=30, choices=AuditModule.choices, db_index=True)
    action = models.CharField(max_length=100, db_index=True)
    details = models.TextField()
    before_state = models.JSONField(null=True, blank=True)
    after_state = models.JSONField(null=True, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    severity = models.CharField(
        max_length=15, choices=AuditSeverity.choices, default=AuditSeverity.INFO)

    class Meta:
        verbose_name = 'Audit Log Entry'
        verbose_name_plural = 'Audit Log Entries'
        ordering = ['-timestamp']

    def save(self, *args, **kwargs):
        # Enforce immutability on already created records
        if self.pk and AuditLog.objects.filter(pk=self.pk).exists():
            raise ValueError(
                'Audit records are immutable and cannot be updated.')
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValueError('Audit records are permanent and cannot be deleted.')

    def __str__(self):
        return f"[{self.timestamp:%Y-%m-%d %H:%M:%S}] {self.module}:{self.action} by {self.actor_name}"
