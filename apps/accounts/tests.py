import pytest
from decimal import Decimal
from django.urls import reverse
from rest_framework.test import APIClient
from apps.accounts.models import User, StaffRole
from apps.properties.models import Property
from apps.audit.models import AuditLog, AuditModule
from apps.audit.services import log_audit_event


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def gm_user(db):
    return User.objects.create_user(
        email='gm@arbaminchhotel.et',
        password='StrongPassword#2026',
        full_name='Ato Yonas Haile',
        role=StaffRole.GENERAL_MANAGER,
    )


@pytest.fixture
def receptionist_user(db):
    return User.objects.create_user(
        email='reception@arbaminchhotel.et',
        password='StrongPassword#2026',
        full_name='W/ro Tigist Alemu',
        role=StaffRole.RECEPTIONIST,
    )


@pytest.fixture
def hotel_property(db):
    return Property.objects.create(
        name='Arbaminch Tourist Hotel',
        tin_number='0062819401',
        vat_rate=Decimal('0.1500'),
        service_charge_rate=Decimal('0.1000'),
        currency='ETB',
    )


@pytest.mark.django_db
def test_property_configuration_adheres_to_ethiopian_tax(hotel_property):
    assert hotel_property.currency == 'ETB'
    assert hotel_property.vat_rate == Decimal('0.1500')
    assert hotel_property.service_charge_rate == Decimal('0.1000')
    assert hotel_property.tin_number == '0062819401'


@pytest.mark.django_db
def test_audit_log_immutability(gm_user):
    log = log_audit_event(
        module=AuditModule.AUTH,
        action='TEST_ACTION',
        details='Testing audit record immutability',
        actor=gm_user,
    )
    assert log.pk is not None

    with pytest.raises(ValueError, match="immutable and cannot be updated"):
        log.details = "Illegal modification attempt"
        log.save()

    with pytest.raises(ValueError, match="permanent and cannot be deleted"):
        log.delete()


@pytest.mark.django_db
def test_user_role_assignment(gm_user, receptionist_user):
    assert gm_user.role == StaffRole.GENERAL_MANAGER
    assert receptionist_user.role == StaffRole.RECEPTIONIST
    assert gm_user.get_role_display() == 'General Manager'
