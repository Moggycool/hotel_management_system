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


class AccessArea(models.TextChoices):
    FRONT_OFFICE = 'front_office', 'Front office (guests, reservations)'
    RESERVATION_ASSIGNMENT = 'reservation_assignment', 'Reservation room assignment'
    ROOM_MANAGEMENT = 'room_management', 'Room management'
    FINANCE = 'finance', 'Billing and finance'
    HOUSEKEEPING = 'housekeeping', 'Housekeeping'
    NIGHT_AUDIT = 'night_audit', 'Night audit'
    RESTAURANT = 'restaurant', 'Restaurant / POS'
    RESTAURANT_SETTLEMENT = 'restaurant_settlement', 'Restaurant settlement'
    RESTAURANT_MENU = 'restaurant_menu', 'Restaurant menu management'
    INVENTORY = 'inventory', 'Inventory / store'
    RECIPES = 'recipes', 'Recipe management'


class Role(models.Model):
    code = models.SlugField(
        max_length=30, unique=True,
        help_text='Permanent identifier, e.g. STORE_SUPERVISOR. Cannot be changed after saving.')
    name = models.CharField(max_length=60, unique=True)
    access_areas = models.JSONField(
        default=list, blank=True,
        help_text='Areas this role can work in. Built-in roles use fixed access.')
    is_builtin = models.BooleanField(default=False, editable=False)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


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
        default=StaffRole.RECEPTIONIST,
        db_index=True,
        help_text='Code of a Role defined under Roles.',
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

    def get_role_display(self):
        role = Role.objects.filter(code=self.role).first()
        return role.name if role else self.role

    def role_access_areas(self):
        if not hasattr(self, '_role_access_areas'):
            role = Role.objects.filter(code=self.role, is_active=True).first()
            self._role_access_areas = set(role.access_areas) if role else set()
        return self._role_access_areas

    def __str__(self):
        return f"{self.full_name} ({self.get_role_display()})"
