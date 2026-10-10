import uuid
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models


class StaffRole(models.TextChoices):
    GENERAL_MANAGER = 'GENERAL_MANAGER', 'General Manager'
    FRONT_OFFICE_MANAGER = 'FRONT_OFFICE_MANAGER', 'Front Office Manager'
    RECEPTIONIST = 'RECEPTIONIST', 'Receptionist'
    CASHIER = 'CASHIER', 'Cashier'
    HOUSEKEEPING_SUPERVISOR = 'HOUSEKEEPING_SUPERVISOR', 'Housekeeping Supervisor'
    HOUSEKEEPER = 'HOUSEKEEPER', 'Housekeeper'
    FB_MANAGER = 'FB_MANAGER', 'Food & Beverage Manager'
    WAITER = 'WAITER', 'Waiter'
    EXECUTIVE_CHEF = 'EXECUTIVE_CHEF', 'Executive Chef'
    STOREKEEPER = 'STOREKEEPER', 'Storekeeper'
    PURCHASING_OFFICER = 'PURCHASING_OFFICER', 'Purchasing Officer'
    FINANCE_OFFICER = 'FINANCE_OFFICER', 'Finance Officer'
    MAINTENANCE = 'MAINTENANCE', 'Maintenance Technician'
    SYSTEM_ADMIN = 'SYSTEM_ADMIN', 'System Administrator'


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('Email address is required')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', StaffRole.SYSTEM_ADMIN)
        return self.create_user(email, password, **extra_fields)


class User(AbstractUser):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    username = None  # Use email as primary unique identifier
    email = models.EmailField('Email Address', unique=True, db_index=True)
    full_name = models.CharField('Full Name', max_length=150)
    phone_number = models.CharField('Phone Number', max_length=20, blank=True)
    role = models.CharField(
        'Staff Role',
        max_length=30,
        choices=StaffRole.choices,
        default=StaffRole.RECEPTIONIST,
        db_index=True,
    )
    is_mfa_enabled = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['full_name']

    objects = UserManager()

    class Meta:
        verbose_name = 'Staff User'
        verbose_name_plural = 'Staff Users'
        ordering = ['full_name']

    def __str__(self):
        return f"{self.full_name} ({self.get_role_display()})"
