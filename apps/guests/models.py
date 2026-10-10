import uuid
from django.db import models


class IDType(models.TextChoices):
    FAYDA = 'FAYDA', 'Fayda National Digital ID (ፋይዳ)'
    KEBELE = 'KEBELE', 'Kebele Resident ID (የቀበሌ መታወቂያ)'
    PASSPORT = 'PASSPORT', 'International Passport'
    DRIVERS_LICENSE = 'DRIVERS_LICENSE', 'Driver License (መንጃ ፈቃድ)'


class VIPTier(models.TextChoices):
    REGULAR = 'REGULAR', 'Regular'
    SILVER = 'SILVER', 'Silver'
    GOLD = 'GOLD', 'Gold'
    PLATINUM = 'PLATINUM', 'Platinum'


class Guest(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    full_name = models.CharField(max_length=150, db_index=True)
    email = models.EmailField(db_index=True, blank=True, null=True)
    phone_number = models.CharField(max_length=25, db_index=True)
    id_type = models.CharField(
        max_length=20, choices=IDType.choices, default=IDType.FAYDA)
    id_number = models.CharField(max_length=50, db_index=True)
    nationality = models.CharField(max_length=50, default='Ethiopian')
    vip_tier = models.CharField(
        max_length=15, choices=VIPTier.choices, default=VIPTier.REGULAR)
    preferences = models.TextField(
        blank=True, help_text='e.g. Feather pillow allergy, quiet high floor')
    total_stays = models.PositiveIntegerField(default=0)
    total_spent_etb = models.DecimalField(
        max_digits=14, decimal_places=2, default=0.00)
    privacy_consent_given = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['full_name']

    def __str__(self):
        return f"{self.full_name} ({self.id_number} - {self.get_vip_tier_display()})"
