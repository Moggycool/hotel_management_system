import uuid
from decimal import Decimal
from django.db import models


class AuditSessionStatus(models.TextChoices):
    IN_PROGRESS = 'IN_PROGRESS', 'In Progress'
    COMPLETED = 'COMPLETED', 'Completed & Date Rolled'
    REOPENED = 'REOPENED', 'Reopened by General Manager'


class NightAuditSession(models.Model):
    """
    Authoritative record of a closed hotel business date.
    Stores operational and revenue snapshots, KPI calculations, and tax ledger records.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    business_date = models.DateField(unique=True, db_index=True)
    next_business_date = models.DateField()
    closed_at = models.DateTimeField(auto_now_add=True, db_index=True)
    closed_by = models.CharField(max_length=150, default='Night Auditor')
    auditor_role = models.CharField(max_length=50, default='Front Office Manager')
    status = models.CharField(
        max_length=20,
        choices=AuditSessionStatus.choices,
        default=AuditSessionStatus.COMPLETED,
        db_index=True
    )

    # Operational metrics
    total_rooms = models.PositiveIntegerField(default=16)
    occupied_rooms = models.PositiveIntegerField(default=0)
    complimentary_rooms = models.PositiveIntegerField(default=0)
    out_of_order_rooms = models.PositiveIntegerField(default=0)
    occupancy_rate = models.DecimalField(max_digits=6, decimal_places=2, default=Decimal('0.00'))
    adr_etb = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    revpar_etb = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))

    # Revenue Breakdown in ETB
    room_revenue_etb = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))
    fb_revenue_etb = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))
    spa_revenue_etb = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))
    transport_revenue_etb = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))
    misc_revenue_etb = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))

    # Tax & Service Surcharges
    vat_etb = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))  # 15%
    service_charge_etb = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))  # 10%
    gross_revenue_etb = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))

    # Payment settlement breakdown
    telebirr_settled_etb = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))
    cash_settled_etb = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))
    cbe_card_settled_etb = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))
    bank_transfer_settled_etb = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))

    # Process logs
    posted_room_charges_count = models.PositiveIntegerField(default=0)
    no_shows_processed_count = models.PositiveIntegerField(default=0)
    unresolved_discrepancies_count = models.PositiveIntegerField(default=0)

    # Immutability & Security
    audit_checksum = models.CharField(max_length=64, blank=True, help_text="SHA-256 seal of closing financials")
    notes = models.TextField(blank=True, default='')
    snapshot_data = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ['-business_date']
        verbose_name = 'Night Audit Business Date Close'
        verbose_name_plural = 'Night Audit Closures'

    def __str__(self):
        return f"Night Audit {self.business_date} (Gross: {self.gross_revenue_etb:,.2f} ETB, Occ: {self.occupancy_rate}%)"
