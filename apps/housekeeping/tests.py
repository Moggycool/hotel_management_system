import pytest
from rest_framework.test import APIClient

from apps.accounts.models import StaffRole, User
from apps.housekeeping.models import HousekeepingTask, MaintenanceTicket
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
    assert str(create_response.data['assigned_to']) == str(user.id)
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


@pytest.mark.django_db
def test_supervisor_only_sees_available_direct_reports_and_assignments_persist():
    supervisor = User.objects.create_user(
        email='hk-supervisor-assignment@example.et',
        password='StrongPassword#2026',
        full_name='Housekeeping Supervisor',
        role=StaffRole.HOUSEKEEPING_SUPERVISOR,
    )
    available_worker = User.objects.create_user(
        email='hk-available@example.et', password='StrongPassword#2026',
        full_name='Available Housekeeper', role=StaffRole.HOUSEKEEPER,
        reports_to=supervisor,
    )
    busy_worker = User.objects.create_user(
        email='hk-busy@example.et', password='StrongPassword#2026',
        full_name='Busy Housekeeper', role=StaffRole.HOUSEKEEPER,
        reports_to=supervisor,
    )
    replacement_worker = User.objects.create_user(
        email='hk-replacement@example.et', password='StrongPassword#2026',
        full_name='Replacement Housekeeper', role=StaffRole.HOUSEKEEPER,
        reports_to=supervisor,
    )
    other_supervisor = User.objects.create_user(
        email='hk-other-supervisor@example.et', password='StrongPassword#2026',
        full_name='Other Supervisor', role=StaffRole.HOUSEKEEPING_SUPERVISOR,
    )
    other_worker = User.objects.create_user(
        email='hk-other-worker@example.et', password='StrongPassword#2026',
        full_name='Other Team Housekeeper', role=StaffRole.HOUSEKEEPER,
        reports_to=other_supervisor,
    )
    room_type = RoomType.objects.create(
        name='Assignment Test Room', description='Assignment test', base_price_etb='3000.00')
    room = Room.objects.create(room_number='701', room_type=room_type, floor=7)
    busy_room = Room.objects.create(
        room_number='702', room_type=room_type, floor=7)
    HousekeepingTask.objects.create(
        room=busy_room, assigned_to=busy_worker, status='PENDING')

    client = APIClient()
    client.force_authenticate(user=supervisor)
    employees = client.get(
        '/api/v1/housekeeping/tasks/available-staff/?work_type=housekeeping')
    assert employees.status_code == 200
    assert {employee['id'] for employee in employees.data} == {
        str(available_worker.id), str(replacement_worker.id),
    }

    created = client.post(
        '/api/v1/housekeeping/tasks/',
        {
            'room': str(room.id), 'task_type': 'CHECKOUT_CLEAN',
            'priority': 'NORMAL', 'assigned_to': str(available_worker.id),
        },
        format='json',
    )
    assert created.status_code == 201, created.data
    task = HousekeepingTask.objects.get(pk=created.data['id'])
    assert task.assigned_to == available_worker

    reassigned = client.patch(
        f'/api/v1/housekeeping/tasks/{task.id}/',
        {'assigned_to': str(replacement_worker.id)}, format='json',
    )
    assert reassigned.status_code == 200, reassigned.data
    task.refresh_from_db()
    assert task.assigned_to == replacement_worker

    unavailable = client.patch(
        f'/api/v1/housekeeping/tasks/{task.id}/',
        {'assigned_to': str(other_worker.id)}, format='json',
    )
    assert unavailable.status_code == 400


@pytest.mark.django_db
def test_supervisor_creates_database_maintenance_ticket_for_direct_report():
    supervisor = User.objects.create_user(
        email='maintenance-supervisor@example.et', password='StrongPassword#2026',
        full_name='Maintenance Supervisor', role=StaffRole.HOUSEKEEPING_SUPERVISOR,
    )
    technician = User.objects.create_user(
        email='maintenance-tech@example.et', password='StrongPassword#2026',
        full_name='Maintenance Technician', role=StaffRole.MAINTENANCE,
        reports_to=supervisor,
    )
    room_type = RoomType.objects.create(
        name='Maintenance Test Room', description='Maintenance test', base_price_etb='3000.00')
    room = Room.objects.create(room_number='703', room_type=room_type, floor=7)
    client = APIClient()
    client.force_authenticate(user=supervisor)

    available = client.get(
        '/api/v1/housekeeping/tasks/available-staff/?work_type=maintenance')
    assert available.status_code == 200
    assert [employee['id']
            for employee in available.data] == [str(technician.id)]

    response = client.post(
        '/api/v1/housekeeping/maintenance/',
        {
            'room': str(room.id), 'title': 'Repair water heater',
            'category': 'PLUMBING', 'priority': 'HIGH',
            'assigned_to': str(technician.id), 'notes': 'No hot water.',
        },
        format='json',
    )
    assert response.status_code == 201, response.data
    ticket = MaintenanceTicket.objects.get(pk=response.data['id'])
    assert ticket.assigned_to == technician
    assert ticket.reported_by == supervisor

    technician_client = APIClient()
    technician_client.force_authenticate(user=technician)
    assert [item['id'] for item in technician_client.get(
        '/api/v1/housekeeping/maintenance/').data] == [str(ticket.id)]
