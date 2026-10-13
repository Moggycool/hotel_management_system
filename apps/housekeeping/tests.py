import pytest
from rest_framework.test import APIClient

from apps.accounts.models import StaffRole, User
from apps.housekeeping.models import HousekeepingTask
from apps.rooms.models import Room, RoomStatus, RoomType
from apps.audit.models import AuditLog, AuditModule


@pytest.mark.django_db
def test_housekeeping_task_api_syncs_task_worker_and_room_lifecycle():
    user = User.objects.create_user(
        email='housekeeper@example.et',
        password='StrongPassword#2026',
        full_name='Almaz Housekeeper',
        role=StaffRole.HOUSEKEEPER,
    )
    room_type = RoomType.objects.create(
        name='Test Standard',
        description='Test room type',
        base_price_etb='3500.00',
    )
    room = Room.objects.create(room_number='501', room_type=room_type, floor=5)
    client = APIClient()
    assert client.get('/api/v1/housekeeping/tasks/').status_code == 401
    client.force_authenticate(user=user)

    create_response = client.post(
        '/api/v1/housekeeping/tasks/',
        {
            'room': str(room.id),
            'task_type': 'CHECKOUT_CLEAN',
            'priority': 'HIGH',
            'notes': 'Turnover cleaning',
        },
        format='json',
    )

    assert create_response.status_code == 201
    task_id = create_response.data['id']
    room.refresh_from_db()
    assert room.housekeeping_status == 'DIRTY'
    assert room.status == RoomStatus.VACANT_DIRTY

    start_response = client.post(
        f'/api/v1/housekeeping/tasks/{task_id}/start/')
    assert start_response.status_code == 200
    assert start_response.data['status'] == 'IN_PROGRESS'
    assert start_response.data['assigned_to_name'] == user.full_name

    complete_response = client.post(
        f'/api/v1/housekeeping/tasks/{task_id}/complete/')
    assert complete_response.status_code == 200
    assert complete_response.data['status'] == 'INSPECTION_REQUIRED'

    inspect_response = client.post(
        f'/api/v1/housekeeping/tasks/{task_id}/inspect/')
    assert inspect_response.status_code == 200
    assert inspect_response.data['status'] == 'COMPLETED'
    room.refresh_from_db()
    assert room.housekeeping_status == 'CLEAN'
    assert room.status == RoomStatus.VACANT_CLEAN
    assert HousekeepingTask.objects.get(pk=task_id).inspected_by == user
    assert AuditLog.objects.filter(
        module=AuditModule.HOUSEKEEPING,
        action='HOUSEKEEPING_STARTED',
        actor_id=user.id,
    ).exists()
    assert AuditLog.objects.filter(
        module=AuditModule.HOUSEKEEPING,
        action='HOUSEKEEPING_INSPECTION_PASSED',
        actor_id=user.id,
    ).exists()

    reopen_response = client.post(
        f'/api/v1/housekeeping/tasks/{task_id}/reopen/')
    assert reopen_response.status_code == 200
    assert reopen_response.data['status'] == 'PENDING'
    room.refresh_from_db()
    assert room.housekeeping_status == 'DIRTY'
    assert room.status == RoomStatus.VACANT_DIRTY
