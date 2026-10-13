import pytest
from rest_framework.test import APIClient

from apps.accounts.models import StaffRole, User
from apps.guests.models import Guest


@pytest.mark.django_db
def test_guest_api_creates_and_updates_profile():
    client = APIClient()
    staff = User.objects.create_user(
        email='receptionist@example.et',
        password='StrongPassword#2026',
        full_name='Test Receptionist',
        role=StaffRole.RECEPTIONIST,
    )
    client.force_authenticate(user=staff)
    create_response = client.post(
        '/api/v1/guests/',
        {
            'full_name': 'Marta Tesfaye',
            'email': 'marta@example.et',
            'phone_number': '+251911223344',
            'id_type': 'FAYDA',
            'id_number': 'FAN-1122-3344',
            'nationality': 'Ethiopian',
            'vip_tier': 'GOLD',
            'preferences': 'Quiet room, extra pillows',
        },
        format='json',
    )

    assert create_response.status_code == 201
    assert create_response.data['full_name'] == 'Marta Tesfaye'
    assert create_response.data['vip_tier'] == 'GOLD'

    guest_id = create_response.data['id']
    update_response = client.patch(
        f'/api/v1/guests/{guest_id}/',
        {'preferences': 'Quiet room only', 'vip_tier': 'PLATINUM'},
        format='json',
    )

    assert update_response.status_code == 200
    guest = Guest.objects.get(pk=guest_id)
    assert guest.preferences == 'Quiet room only'
    assert guest.vip_tier == 'PLATINUM'
