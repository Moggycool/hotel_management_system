import pytest
from rest_framework.test import APIClient

from apps.accounts.models import StaffRole, User
from apps.properties.models import Property
from apps.audit.models import AuditLog, AuditModule


@pytest.mark.django_db
def test_property_config_is_readable_to_staff_and_writable_only_by_gm():
    receptionist = User.objects.create_user(
        email='frontdesk-property@example.et',
        password='StrongPassword#2026',
        full_name='Front Desk User',
        role=StaffRole.RECEPTIONIST,
    )
    general_manager = User.objects.create_user(
        email='gm-property@example.et',
        password='StrongPassword#2026',
        full_name='Hotel General Manager',
        role=StaffRole.GENERAL_MANAGER,
    )
    receptionist_client = APIClient()
    receptionist_client.force_authenticate(user=receptionist)

    read_response = receptionist_client.get('/api/v1/properties/current/')
    assert read_response.status_code == 200
    assert read_response.data['name'] == 'Arbaminch Tourist Hotel'

    denied_update = receptionist_client.patch(
        '/api/v1/properties/current/',
        {'name': 'Unauthorized Property Edit'},
        format='json',
    )
    assert denied_update.status_code == 403

    manager_client = APIClient()
    manager_client.force_authenticate(user=general_manager)
    update_response = manager_client.patch(
        '/api/v1/properties/current/',
        {'vat_rate': '0.1600', 'check_in_time': '15:00:00'},
        format='json',
    )

    assert update_response.status_code == 200
    property_config = Property.objects.get(pk=read_response.data['id'])
    assert str(property_config.vat_rate) == '0.1600'
    audit_entry = AuditLog.objects.get(action='PROPERTY_CONFIGURATION_UPDATED')
    assert audit_entry.module == AuditModule.AUTH
    assert audit_entry.actor_id == general_manager.id
    assert audit_entry.before_state['vat_rate'] == '0.1500'
    assert audit_entry.after_state['vat_rate'] == '0.1600'
