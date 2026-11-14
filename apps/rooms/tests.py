import pytest
from decimal import Decimal
from datetime import date, timedelta
from django.utils import timezone
from apps.accounts.models import StaffRole, User
from apps.rooms.models import RoomType, Room, RatePlan, RoomStatus
from apps.rooms.services import AvailabilityEngine
from apps.guests.models import Guest, IDType
from apps.reservations.models import Reservation, BookingSource, ReservationStatus
from apps.housekeeping.models import HousekeepingTask, MaintenanceTicket
from apps.billing.models import Folio, FolioItem
from apps.audit.models import AuditLog, AuditModule
from rest_framework.test import APIClient


def authenticated_client(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.fixture
def setup_rooms(db):
    rt = RoomType.objects.create(
        name='Deluxe Chamo View',
        base_price_etb=Decimal('5000.00'),
        max_adults=2,
    )
    r1 = Room.objects.create(room_number='201', room_type=rt, floor=2)
    r2 = Room.objects.create(room_number='202', room_type=rt, floor=2)

    rp = RatePlan.objects.create(
        name='Standard Rate', multiplier=Decimal('1.00'))

    guest = Guest.objects.create(
        full_name='Ato Girma Wolde',
        phone_number='+251912345678',
        id_type=IDType.FAYDA,
        id_number='FAN-8819-2041',
    )
    user = User.objects.create_user(
        email='gm-tests@example.et',
        password='StrongPassword#2026',
        full_name='Test General Manager',
        role=StaffRole.GENERAL_MANAGER,
    )

    return {'rt': rt, 'r1': r1, 'r2': r2, 'rp': rp, 'guest': guest, 'user': user}


@pytest.mark.django_db
def test_availability_engine_excludes_overlapping_reservations(setup_rooms):
    today = timezone.localdate()
    check_in = today
    check_out = today + timedelta(days=3)

    # Book Room 201 for today -> +3 days
    Reservation.objects.create(
        confirmation_code='TEST-RES-201',
        guest=setup_rooms['guest'],
        room=setup_rooms['r1'],
        rate_plan=setup_rooms['rp'],
        check_in_date=check_in,
        check_out_date=check_out,
        status=ReservationStatus.CONFIRMED,
        room_rate_total_etb=Decimal('15000.00'),
        service_charge_etb=Decimal('1500.00'),
        vat_etb=Decimal('2250.00'),
        grand_total_etb=Decimal('18750.00'),
    )

    # Search availability for the same window
    avail_rooms = AvailabilityEngine.get_available_rooms(check_in, check_out)

    # Room 201 must be excluded, Room 202 must be available
    assert setup_rooms['r1'] not in avail_rooms
    assert setup_rooms['r2'] in avail_rooms


@pytest.mark.django_db
def test_availability_engine_only_returns_inspected_vacant_rooms(setup_rooms):
    setup_rooms['r1'].status = RoomStatus.VACANT_DIRTY
    setup_rooms['r1'].housekeeping_status = 'DIRTY'
    setup_rooms['r1'].save(update_fields=['status', 'housekeeping_status'])

    available_rooms = AvailabilityEngine.get_available_rooms(
        timezone.localdate(), timezone.localdate() + timedelta(days=1))

    assert setup_rooms['r1'] not in available_rooms
    assert setup_rooms['r2'] in available_rooms


@pytest.mark.django_db
def test_room_availability_api_filters_by_requested_dates(setup_rooms):
    today = timezone.localdate()
    Reservation.objects.create(
        confirmation_code='TEST-AVAILABILITY-API',
        guest=setup_rooms['guest'],
        room=setup_rooms['r1'],
        rate_plan=setup_rooms['rp'],
        check_in_date=today + timedelta(days=1),
        check_out_date=today + timedelta(days=4),
        status=ReservationStatus.CONFIRMED,
        room_rate_total_etb=Decimal('15000.00'),
        service_charge_etb=Decimal('1500.00'),
        vat_etb=Decimal('2250.00'),
        grand_total_etb=Decimal('18750.00'),
    )

    response = authenticated_client(setup_rooms['user']).get(
        '/api/v1/rooms/availability/',
        {'check_in': str(today + timedelta(days=2)),
         'check_out': str(today + timedelta(days=3))},
    )

    assert response.status_code == 200
    assert [room['room_number'] for room in response.data] == ['202']


@pytest.mark.django_db
def test_room_availability_api_rejects_invalid_date_window(setup_rooms):
    today = timezone.localdate()
    response = authenticated_client(setup_rooms['user']).get(
        '/api/v1/rooms/availability/',
        {'check_in': str(today + timedelta(days=2)),
         'check_out': str(today + timedelta(days=1))},
    )

    assert response.status_code == 400


@pytest.mark.django_db
def test_reservation_without_identity_number_does_not_generate_fake_id(setup_rooms):
    today = timezone.localdate()
    response = authenticated_client(setup_rooms['user']).post(
        '/api/v1/reservations/',
        {
            'guest_name': 'Guest Without ID',
            'guest_phone': '+251911000099',
            'room_number': setup_rooms['r1'].room_number,
            'rate_plan_name': setup_rooms['rp'].name,
            'check_in_date': str(today),
            'check_out_date': str(today + timedelta(days=1)),
            'adults': 1,
            'children': 0,
            'room_rate_total_etb': '5000.00',
            'service_charge_etb': '500.00',
            'vat_etb': '750.00',
            'grand_total_etb': '6250.00',
            'deposit_paid_etb': '500.00',
        },
        format='json',
    )

    assert response.status_code == 201, response.data
    guest = Guest.objects.get(pk=response.data['guest'])
    assert guest.id_number == ''


@pytest.mark.django_db
def test_staff_reservation_rejects_zero_deposit(setup_rooms):
    today = timezone.localdate()
    response = authenticated_client(setup_rooms['user']).post(
        '/api/v1/reservations/',
        {
            'guest_name': 'No Deposit Guest',
            'guest_phone': '+251911000098',
            'room_number': setup_rooms['r1'].room_number,
            'rate_plan_name': setup_rooms['rp'].name,
            'check_in_date': str(today),
            'check_out_date': str(today + timedelta(days=1)),
            'room_rate_total_etb': '5000.00',
            'service_charge_etb': '500.00',
            'vat_etb': '750.00',
            'grand_total_etb': '6250.00',
            'deposit_paid_etb': '0.00',
        },
        format='json',
    )

    assert response.status_code == 400
    assert 'deposit_paid_etb' in response.data
    assert not Reservation.objects.filter(
        guest__phone_number='+251911000098').exists()


@pytest.mark.django_db
def test_rate_plan_discount_calculation(setup_rooms):
    resident_rate = RatePlan.objects.create(
        name='Resident 15% Off',
        multiplier=Decimal('0.85'),
        is_resident_only=True,
    )
    base_price = Decimal('5000.00')
    calculated = resident_rate.calculate_nightly_rate(base_price)
    assert calculated == Decimal('4250.00')


@pytest.mark.django_db
def test_front_office_manager_proposes_rate_plan_and_general_manager_approves(setup_rooms):
    front_office_manager = User.objects.create_user(
        email='rate-proposer@example.et', password='StrongPassword#2026',
        full_name='Rate Proposer', role=StaffRole.FRONT_OFFICE_MANAGER,
    )
    proposal_payload = {
        'name': 'Corporate Weekday Rate',
        'multiplier': '0.90',
        'fixed_surcharge_etb': '250.00',
        'description': 'Negotiated weekday corporate pricing',
        'is_resident_only': False,
    }
    proposal_response = authenticated_client(front_office_manager).post(
        '/api/v1/rooms/rate-plan-proposals/', proposal_payload, format='json')
    assert proposal_response.status_code == 201, proposal_response.data
    assert proposal_response.data['status'] == 'PENDING'
    assert not RatePlan.objects.filter(name=proposal_payload['name']).exists()

    manager = setup_rooms['user']
    manager_client = authenticated_client(manager)
    direct_change = manager_client.post(
        '/api/v1/rooms/rate-plans/',
        {
            'name': 'Unapproved Direct Rate', 'multiplier': '0.80',
            'fixed_surcharge_etb': '0.00', 'description': 'Bypass proposal',
        },
        format='json',
    )
    assert direct_change.status_code == 403

    approval = manager_client.post(
        f"/api/v1/rooms/rate-plan-proposals/{proposal_response.data['id']}/approve/",
        {'decision_notes': 'Approved for signed corporate agreement.'},
        format='json',
    )
    assert approval.status_code == 200, approval.data
    assert approval.data['status'] == 'APPROVED'
    assert str(approval.data['approved_by']) == str(manager.id)
    rate_plan = RatePlan.objects.get(name=proposal_payload['name'])
    assert rate_plan.multiplier == Decimal('0.90')
    assert rate_plan.fixed_surcharge_etb == Decimal('250.00')
    assert AuditLog.objects.filter(
        action='RATE_PLAN_PROPOSAL_APPROVED', actor_id=manager.id,
    ).exists()


@pytest.mark.django_db
def test_room_api_creates_and_updates_room(setup_rooms):
    client = authenticated_client(setup_rooms['user'])
    response = client.post(
        '/api/v1/rooms/',
        {
            'room_number': '203',
            'room_type_id': str(setup_rooms['rt'].id),
            'floor': 2,
            'wing': 'East Wing',
            'status': RoomStatus.VACANT_CLEAN,
            'housekeeping_status': 'CLEAN',
            'notes': '',
        },
        format='json',
    )

    assert response.status_code == 201
    assert response.data['room_number'] == '203'
    assert response.data['wing'] == 'East Wing'
    assert response.data['room_type']['id'] == str(setup_rooms['rt'].id)

    status_response = client.patch(
        f"/api/v1/rooms/{response.data['id']}/",
        {'status': RoomStatus.MAINTENANCE, 'notes': 'Repair required'},
        format='json',
    )

    assert status_response.status_code == 400
    update_response = client.patch(
        f"/api/v1/rooms/{response.data['id']}/",
        {'notes': 'Repair required', 'wing': 'North Wing'},
        format='json',
    )
    assert update_response.status_code == 200
    assert update_response.data['notes'] == 'Repair required'
    assert update_response.data['wing'] == 'North Wing'


@pytest.mark.django_db
def test_oos_status_is_owned_by_housekeeping_supervisor(setup_rooms):
    supervisor = User.objects.create_user(
        email='oos-supervisor@example.et', password='StrongPassword#2026',
        full_name='OOS Supervisor', role=StaffRole.HOUSEKEEPING_SUPERVISOR,
    )
    response = authenticated_client(supervisor).post(
        f'/api/v1/rooms/{setup_rooms["r1"].id}/set-operational-status/',
        {'status': RoomStatus.OUT_OF_SERVICE, 'reason': 'Deep sanitation'},
        format='json',
    )

    assert response.status_code == 200, response.data
    setup_rooms['r1'].refresh_from_db()
    assert setup_rooms['r1'].status == RoomStatus.OUT_OF_SERVICE
    assert setup_rooms['r1'].status_reason == 'Deep sanitation'
    assert setup_rooms['r1'] not in AvailabilityEngine.get_available_rooms(
        timezone.localdate(), timezone.localdate() + timedelta(days=1))


@pytest.mark.django_db
def test_ooo_requires_work_order_and_fom_confirmation_with_booking_warning(setup_rooms):
    today = timezone.localdate()
    reservation = Reservation.objects.create(
        confirmation_code='TEST-OOO-WARNING', guest=setup_rooms['guest'],
        room=setup_rooms['r1'], rate_plan=setup_rooms['rp'],
        check_in_date=today + timedelta(days=2),
        check_out_date=today + timedelta(days=4),
        status=ReservationStatus.CONFIRMED,
        room_rate_total_etb=Decimal('5000.00'),
        service_charge_etb=Decimal('500.00'), vat_etb=Decimal('750.00'),
        grand_total_etb=Decimal('6250.00'),
    )
    technician = User.objects.create_user(
        email='ooo-tech@example.et', password='StrongPassword#2026',
        full_name='OOO Technician', role=StaffRole.MAINTENANCE,
    )
    manager = User.objects.create_user(
        email='ooo-fom@example.et', password='StrongPassword#2026',
        full_name='OOO Front Office Manager', role=StaffRole.FRONT_OFFICE_MANAGER,
    )
    ticket = MaintenanceTicket.objects.create(
        room=setup_rooms['r1'], title='Replace damaged heater',
        category='HVAC', reported_by=technician,
    )
    expected_return = today + timedelta(days=10)

    request_response = authenticated_client(technician).post(
        f'/api/v1/rooms/{setup_rooms["r1"].id}/request-out-of-order/',
        {
            'reason': 'Heater replacement requires parts',
            'expected_return_date': str(expected_return),
            'maintenance_ticket_id': str(ticket.id),
        },
        format='json',
    )
    assert request_response.status_code == 200, request_response.data
    setup_rooms['r1'].refresh_from_db()
    assert setup_rooms['r1'].status == RoomStatus.VACANT_CLEAN

    confirm_response = authenticated_client(manager).post(
        f'/api/v1/rooms/{setup_rooms["r1"].id}/confirm-out-of-order/',
        format='json',
    )
    assert confirm_response.status_code == 200, confirm_response.data
    setup_rooms['r1'].refresh_from_db()
    assert setup_rooms['r1'].status == RoomStatus.OUT_OF_ORDER
    assert setup_rooms['r1'].out_of_order_ticket == ticket
    assert any(reservation.confirmation_code in warning
               for warning in confirm_response.data['warnings'])


@pytest.mark.django_db
def test_in_house_room_move_requires_reason_and_keeps_folio(setup_rooms):
    today = timezone.localdate()
    reservation = Reservation.objects.create(
        confirmation_code='TEST-INHOUSE-MOVE', guest=setup_rooms['guest'],
        room=setup_rooms['r1'], rate_plan=setup_rooms['rp'],
        check_in_date=today, check_out_date=today + timedelta(days=2),
        status=ReservationStatus.CHECKED_IN,
        room_rate_total_etb=Decimal('10000.00'),
        service_charge_etb=Decimal('1000.00'), vat_etb=Decimal('1500.00'),
        grand_total_etb=Decimal('12500.00'),
    )
    setup_rooms['r1'].status = RoomStatus.OCCUPIED
    setup_rooms['r1'].save(update_fields=['status'])
    folio = Folio.objects.create(
        reservation=reservation, guest=setup_rooms['guest'])
    manager = User.objects.create_user(
        email='move-fom@example.et', password='StrongPassword#2026',
        full_name='Move Front Office Manager', role=StaffRole.FRONT_OFFICE_MANAGER,
    )
    client = authenticated_client(manager)

    missing_reason = client.patch(
        f'/api/v1/reservations/{reservation.id}/change-room/',
        {'room_id': str(setup_rooms['r2'].id)}, format='json',
    )
    assert missing_reason.status_code == 400

    response = client.patch(
        f'/api/v1/reservations/{reservation.id}/change-room/',
        {'room_id': str(setup_rooms['r2'].id), 'reason': 'AC failure'},
        format='json',
    )
    assert response.status_code == 200, response.data
    reservation.refresh_from_db()
    setup_rooms['r1'].refresh_from_db()
    setup_rooms['r2'].refresh_from_db()
    assert reservation.room == setup_rooms['r2']
    assert reservation.folio == folio
    assert setup_rooms['r1'].status == RoomStatus.VACANT_DIRTY
    assert setup_rooms['r2'].status == RoomStatus.OCCUPIED
    assert HousekeepingTask.objects.filter(
        room__in=[setup_rooms['r1'], setup_rooms['r2']]).count() == 2


@pytest.mark.django_db
def test_checkout_requires_settled_folio_and_closes_it(setup_rooms):
    today = timezone.localdate()
    reservation = Reservation.objects.create(
        confirmation_code='TEST-CHECKOUT-FOLIO', guest=setup_rooms['guest'],
        room=setup_rooms['r1'], rate_plan=setup_rooms['rp'],
        check_in_date=today - timedelta(days=1), check_out_date=today,
        status=ReservationStatus.CHECKED_IN,
        room_rate_total_etb=Decimal('5000.00'),
        service_charge_etb=Decimal('500.00'), vat_etb=Decimal('750.00'),
        grand_total_etb=Decimal('6250.00'),
    )
    setup_rooms['r1'].status = RoomStatus.OCCUPIED
    setup_rooms['r1'].save(update_fields=['status'])
    folio = Folio.objects.create(
        reservation=reservation, guest=setup_rooms['guest'])
    FolioItem.objects.create(
        folio=folio, category='ROOM', description='Room charge', amount=Decimal('10.00'),
    )
    client = authenticated_client(setup_rooms['user'])

    blocked = client.post('/api/v1/reservations/check-out/', {
        'confirmation_code': reservation.confirmation_code,
    }, format='json')
    assert blocked.status_code == 409
    assert not Folio.objects.get(pk=folio.pk).is_closed

    FolioItem.objects.filter(folio=folio).delete()
    settled = client.post('/api/v1/reservations/check-out/', {
        'confirmation_code': reservation.confirmation_code,
    }, format='json')
    assert settled.status_code == 200, settled.data
    folio.refresh_from_db()
    assert folio.is_closed
    assert folio.closed_at is not None


@pytest.mark.django_db
def test_room_type_crud_persists_details_and_photo(setup_rooms, settings, tmp_path):
    from io import BytesIO

    from PIL import Image
    from django.core.files.uploadedfile import SimpleUploadedFile

    settings.MEDIA_ROOT = tmp_path
    client = authenticated_client(setup_rooms['user'])
    image_buffer = BytesIO()
    Image.new('RGB', (1, 1), color='white').save(image_buffer, format='PNG')
    png = image_buffer.getvalue()
    response = client.post(
        '/api/v1/rooms/room-types/',
        {
            'name': 'Lake View Suite', 'name_amharic': 'የሐይቅ እይታ ስዊት',
            'description': 'Suite overlooking Lake Chamo',
            'base_price_etb': '8500.00', 'max_adults': '3', 'max_children': '2',
            'bed_type': '1 King Bed', 'size_sqm': '48',
            'amenities': '["Wi-Fi", "Lake view"]',
            'photo': SimpleUploadedFile('suite.png', png, content_type='image/png'),
        },
        format='multipart',
    )

    assert response.status_code == 201, response.data
    room_type = RoomType.objects.get(name='Lake View Suite')
    assert room_type.base_price_etb == Decimal('8500.00')
    assert room_type.photo.name.startswith('room-types/')
    assert response.data['photo'].endswith(room_type.photo.name)

    update = client.patch(
        f'/api/v1/rooms/room-types/{room_type.id}/',
        {'base_price_etb': '9000.00', 'amenities': '["Wi-Fi"]'},
        format='multipart',
    )
    assert update.status_code == 200, update.data
    room_type.refresh_from_db()
    assert room_type.base_price_etb == Decimal('9000.00')
    assert room_type.amenities == ['Wi-Fi']


@pytest.mark.django_db
def test_room_type_delete_rejects_type_assigned_to_rooms(setup_rooms):
    client = authenticated_client(setup_rooms['user'])
    response = client.delete(
        f'/api/v1/rooms/room-types/{setup_rooms["rt"].id}/')

    assert response.status_code == 400
    assert RoomType.objects.filter(pk=setup_rooms['rt'].id).exists()


@pytest.mark.django_db
def test_room_type_writes_are_limited_to_general_manager_and_system_admin(setup_rooms):
    receptionist = User.objects.create_user(
        email='room-type-receptionist@example.et', password='StrongPassword#2026',
        full_name='Receptionist', role=StaffRole.RECEPTIONIST,
    )
    system_admin = User.objects.create_user(
        email='room-type-admin@example.et', password='StrongPassword#2026',
        full_name='System Administrator', role=StaffRole.SYSTEM_ADMIN,
    )
    receptionist_client = authenticated_client(receptionist)
    denied = receptionist_client.patch(
        f'/api/v1/rooms/room-types/{setup_rooms["rt"].id}/',
        {'name': 'Unauthorized Type'}, format='json',
    )
    assert denied.status_code == 403

    admin_client = authenticated_client(system_admin)
    allowed = admin_client.patch(
        f'/api/v1/rooms/room-types/{setup_rooms["rt"].id}/',
        {'name': 'Updated Room Type'}, format='json',
    )
    assert allowed.status_code == 200, allowed.data


@pytest.mark.django_db
@pytest.mark.parametrize(
    'role', [StaffRole.RECEPTIONIST, StaffRole.FRONT_OFFICE_MANAGER],
)
def test_front_desk_can_edit_room_number_and_floor(setup_rooms, role):
    staff = User.objects.create_user(
        email=f'{role.lower()}-room-edit@example.et',
        password='StrongPassword#2026',
        full_name='Front Desk Room Editor',
        role=role,
    )

    response = authenticated_client(staff).patch(
        f'/api/v1/rooms/{setup_rooms["r1"].pk}/',
        {'room_number': '211', 'floor': 3},
        format='json',
    )

    assert response.status_code == 200, response.data
    setup_rooms['r1'].refresh_from_db()
    assert setup_rooms['r1'].room_number == '211'
    assert setup_rooms['r1'].floor == 3


@pytest.mark.django_db
def test_front_desk_can_remove_unbooked_room_without_deleting_history(setup_rooms):
    client = authenticated_client(setup_rooms['user'])

    response = client.delete(f'/api/v1/rooms/{setup_rooms["r1"].pk}/')

    assert response.status_code == 204
    setup_rooms['r1'].refresh_from_db()
    assert setup_rooms['r1'].is_active is False
    assert not client.get('/api/v1/rooms/').data or all(
        item['id'] != str(setup_rooms['r1'].pk)
        for item in client.get('/api/v1/rooms/').data
    )


@pytest.mark.django_db
def test_room_with_active_reservation_cannot_be_removed(setup_rooms):
    today = timezone.localdate()
    reservation = Reservation.objects.create(
        confirmation_code='TEST-ROOM-ACTIVE-DELETE',
        guest=setup_rooms['guest'],
        room=setup_rooms['r1'],
        rate_plan=setup_rooms['rp'],
        check_in_date=today + timedelta(days=1),
        check_out_date=today + timedelta(days=2),
        status=ReservationStatus.CONFIRMED,
        room_rate_total_etb=Decimal('5000.00'),
        service_charge_etb=Decimal('500.00'),
        vat_etb=Decimal('750.00'),
        grand_total_etb=Decimal('6250.00'),
    )

    response = authenticated_client(setup_rooms['user']).delete(
        f'/api/v1/rooms/{setup_rooms["r1"].pk}/')

    assert response.status_code == 400
    setup_rooms['r1'].refresh_from_db()
    assert setup_rooms['r1'].is_active is True
    assert Reservation.objects.filter(pk=reservation.pk).exists()


@pytest.mark.django_db
def test_non_front_desk_role_cannot_edit_or_remove_room(setup_rooms):
    housekeeper = User.objects.create_user(
        email='housekeeper-room-mutation@example.et',
        password='StrongPassword#2026',
        full_name='Room Mutation Housekeeper',
        role=StaffRole.HOUSEKEEPER,
    )
    client = authenticated_client(housekeeper)

    edit_response = client.patch(
        f'/api/v1/rooms/{setup_rooms["r1"].pk}/',
        {'room_number': '212'},
        format='json',
    )
    delete_response = client.delete(
        f'/api/v1/rooms/{setup_rooms["r1"].pk}/')

    assert edit_response.status_code == 403
    assert delete_response.status_code == 403
    setup_rooms['r1'].refresh_from_db()
    assert setup_rooms['r1'].room_number == '201'
    assert setup_rooms['r1'].is_active is True


@pytest.mark.django_db
def test_housekeeping_role_cannot_write_room_inventory(setup_rooms):
    housekeeper = User.objects.create_user(
        email='housekeeper-room-test@example.et',
        password='StrongPassword#2026',
        full_name='Test Housekeeper',
        role=StaffRole.HOUSEKEEPER,
    )
    response = authenticated_client(housekeeper).post(
        '/api/v1/rooms/',
        {
            'room_number': '203',
            'room_type_id': str(setup_rooms['rt'].id),
            'floor': 2,
            'status': RoomStatus.VACANT_CLEAN,
            'housekeeping_status': 'CLEAN',
            'notes': '',
        },
        format='json',
    )

    assert response.status_code == 403
    assert not Room.objects.filter(room_number='203').exists()


@pytest.mark.django_db
def test_reservation_check_in_and_out_update_room_and_queue_cleaning(setup_rooms):
    today = timezone.localdate()
    reservation = Reservation.objects.create(
        confirmation_code='TEST-CHECKIN-001',
        guest=setup_rooms['guest'],
        room=setup_rooms['r1'],
        rate_plan=setup_rooms['rp'],
        check_in_date=today,
        check_out_date=today + timedelta(days=1),
        status=ReservationStatus.CONFIRMED,
        room_rate_total_etb=Decimal('5000.00'),
        service_charge_etb=Decimal('500.00'),
        vat_etb=Decimal('750.00'),
        grand_total_etb=Decimal('6250.00'),
        deposit_paid_etb=Decimal('500.00'),
    )
    client = authenticated_client(setup_rooms['user'])

    check_in_response = client.post(
        '/api/v1/reservations/check-in/',
        {'confirmation_code': reservation.confirmation_code},
        format='json',
    )
    assert check_in_response.status_code == 200
    reservation.refresh_from_db()
    setup_rooms['r1'].refresh_from_db()
    assert reservation.status == ReservationStatus.CHECKED_IN
    assert reservation.actual_check_in_time is not None
    assert setup_rooms['r1'].status == RoomStatus.OCCUPIED

    check_out_response = client.post(
        '/api/v1/reservations/check-out/',
        {'confirmation_code': reservation.confirmation_code},
        format='json',
    )
    assert check_out_response.status_code == 200
    reservation.refresh_from_db()
    setup_rooms['r1'].refresh_from_db()
    assert reservation.status == ReservationStatus.CHECKED_OUT
    assert reservation.actual_check_out_time is not None
    assert setup_rooms['r1'].status == RoomStatus.VACANT_DIRTY
    assert setup_rooms['r1'].housekeeping_status == 'DIRTY'
    assert HousekeepingTask.objects.filter(room=setup_rooms['r1']).count() == 1
    audit_actions = set(AuditLog.objects.values_list('action', flat=True))
    assert 'RESERVATION_CHECKED_IN' in audit_actions
    assert 'RESERVATION_CHECKED_OUT' in audit_actions
    assert AuditLog.objects.filter(
        module=AuditModule.RESERVATION,
        action='RESERVATION_CHECKED_OUT',
        actor_id=None,
    ).exists() is False

    repeat_check_out = client.post(
        '/api/v1/reservations/check-out/',
        {'confirmation_code': reservation.confirmation_code},
        format='json',
    )
    assert repeat_check_out.status_code == 409
    assert HousekeepingTask.objects.filter(room=setup_rooms['r1']).count() == 1


@pytest.mark.django_db
def test_cancellation_and_no_show_release_room_availability(setup_rooms):
    today = timezone.localdate()
    cancelled = Reservation.objects.create(
        confirmation_code='TEST-CANCEL-001',
        guest=setup_rooms['guest'],
        room=setup_rooms['r1'],
        rate_plan=setup_rooms['rp'],
        check_in_date=today + timedelta(days=1),
        check_out_date=today + timedelta(days=3),
        status=ReservationStatus.CONFIRMED,
        room_rate_total_etb=Decimal('10000.00'),
        service_charge_etb=Decimal('1000.00'),
        vat_etb=Decimal('1500.00'),
        grand_total_etb=Decimal('12500.00'),
        deposit_paid_etb=Decimal('500.00'),
    )
    no_show = Reservation.objects.create(
        confirmation_code='TEST-NOSHOW-001',
        guest=setup_rooms['guest'],
        room=setup_rooms['r2'],
        rate_plan=setup_rooms['rp'],
        check_in_date=today,
        check_out_date=today + timedelta(days=2),
        status=ReservationStatus.CONFIRMED,
        room_rate_total_etb=Decimal('10000.00'),
        service_charge_etb=Decimal('1000.00'),
        vat_etb=Decimal('1500.00'),
        grand_total_etb=Decimal('12500.00'),
        deposit_paid_etb=Decimal('500.00'),
    )
    client = authenticated_client(setup_rooms['user'])

    cancel_response = client.post(
        '/api/v1/reservations/cancel/',
        {'confirmation_code': cancelled.confirmation_code},
        format='json',
    )
    no_show_response = client.post(
        '/api/v1/reservations/no-show/',
        {'confirmation_code': no_show.confirmation_code},
        format='json',
    )

    assert cancel_response.status_code == 200
    assert no_show_response.status_code == 200
    cancelled.refresh_from_db()
    no_show.refresh_from_db()
    assert cancelled.status == ReservationStatus.CANCELLED
    assert no_show.status == ReservationStatus.NO_SHOW
    assert AuditLog.objects.filter(action='RESERVATION_CANCELLED').exists()
    assert AuditLog.objects.filter(
        action='RESERVATION_MARKED_NO_SHOW').exists()

    available = AvailabilityEngine.get_available_rooms(
        today + timedelta(days=1), today + timedelta(days=2))
    assert setup_rooms['r1'] in available
    assert setup_rooms['r2'] in available


@pytest.mark.django_db
@pytest.mark.parametrize(
    'role', [StaffRole.RECEPTIONIST, StaffRole.FRONT_OFFICE_MANAGER],
)
def test_front_desk_can_cancel_fully_paid_confirmed_reservation_without_refund(
    setup_rooms, role,
):
    today = timezone.localdate()
    reservation = Reservation.objects.create(
        confirmation_code=f'TEST-FULLY-PAID-CANCEL-{role}',
        guest=setup_rooms['guest'],
        room=setup_rooms['r1'],
        rate_plan=setup_rooms['rp'],
        check_in_date=today + timedelta(days=1),
        check_out_date=today + timedelta(days=3),
        status=ReservationStatus.CONFIRMED,
        room_rate_total_etb=Decimal('10000.00'),
        service_charge_etb=Decimal('1000.00'),
        vat_etb=Decimal('1500.00'),
        grand_total_etb=Decimal('12500.00'),
        deposit_paid_etb=Decimal('12500.00'),
    )
    staff = User.objects.create_user(
        email=f'{role.lower()}-fully-paid-cancel@example.et',
        password='StrongPassword#2026',
        full_name='Front Desk Cancellation Staff',
        role=role,
    )

    response = authenticated_client(staff).post(
        '/api/v1/reservations/cancel/',
        {'confirmation_code': reservation.confirmation_code},
        format='json',
    )

    assert response.status_code == 200, response.data
    reservation.refresh_from_db()
    assert reservation.status == ReservationStatus.CANCELLED
    assert reservation.deposit_paid_etb == Decimal('12500.00')
    cancellation_log = AuditLog.objects.get(
        action='RESERVATION_CANCELLED',
        details__contains=reservation.confirmation_code,
    )
    assert cancellation_log.after_state['deposit_paid_etb'] == '12500.00'
    assert 'no refund was initiated' in cancellation_log.details


@pytest.mark.django_db
def test_future_reservation_cannot_be_marked_no_show(setup_rooms):
    today = timezone.localdate()
    reservation = Reservation.objects.create(
        confirmation_code='TEST-FUTURE-NOSHOW',
        guest=setup_rooms['guest'],
        room=setup_rooms['r1'],
        rate_plan=setup_rooms['rp'],
        check_in_date=today + timedelta(days=1),
        check_out_date=today + timedelta(days=2),
        status=ReservationStatus.CONFIRMED,
        room_rate_total_etb=Decimal('5000.00'),
        service_charge_etb=Decimal('500.00'),
        vat_etb=Decimal('750.00'),
        grand_total_etb=Decimal('6250.00'),
    )

    response = authenticated_client(setup_rooms['user']).post(
        '/api/v1/reservations/no-show/',
        {'confirmation_code': reservation.confirmation_code},
        format='json',
    )

    assert response.status_code == 400
    reservation.refresh_from_db()
    assert reservation.status == ReservationStatus.CONFIRMED


@pytest.mark.django_db
def test_reservation_api_rejects_overlapping_room_booking(setup_rooms):
    today = timezone.localdate()
    Reservation.objects.create(
        confirmation_code='TEST-OVERLAP-001',
        guest=setup_rooms['guest'],
        room=setup_rooms['r1'],
        rate_plan=setup_rooms['rp'],
        check_in_date=today + timedelta(days=1),
        check_out_date=today + timedelta(days=4),
        status=ReservationStatus.CONFIRMED,
        room_rate_total_etb=Decimal('15000.00'),
        service_charge_etb=Decimal('1500.00'),
        vat_etb=Decimal('2250.00'),
        grand_total_etb=Decimal('18750.00'),
    )

    response = authenticated_client(setup_rooms['user']).post(
        '/api/v1/reservations/',
        {
            'confirmation_code': 'TEST-OVERLAP-002',
            'guest_name': 'Another Guest',
            'guest_phone': '+251911000002',
            'room_number': '201',
            'rate_plan_name': 'Standard Rate',
            'check_in_date': str(today + timedelta(days=2)),
            'check_out_date': str(today + timedelta(days=5)),
            'room_rate_total_etb': '15000.00',
            'service_charge_etb': '1500.00',
            'vat_etb': '2250.00',
            'grand_total_etb': '18750.00',
        },
        format='json',
    )

    assert response.status_code == 400
    assert 'room_number' in response.data
    assert not Reservation.objects.filter(
        confirmation_code='TEST-OVERLAP-002').exists()


@pytest.mark.django_db
def test_reservation_api_creates_valid_booking_in_available_room(setup_rooms):
    today = timezone.localdate()
    response = authenticated_client(setup_rooms['user']).post(
        '/api/v1/reservations/',
        {
            'confirmation_code': 'TEST-AVAILABLE-001',
            'guest_name': 'Available Room Guest',
            'guest_email': 'available@example.et',
            'guest_phone': '+251911000004',
            'room_number': '202',
            'rate_plan_name': 'Standard Rate',
            'check_in_date': str(today + timedelta(days=1)),
            'check_out_date': str(today + timedelta(days=3)),
            'adults': 2,
            'children': 0,
            'room_rate_total_etb': '10000.00',
            'service_charge_etb': '1000.00',
            'vat_etb': '1500.00',
            'grand_total_etb': '12500.00',
            'deposit_paid_etb': '5000.00',
        },
        format='json',
    )

    assert response.status_code == 201
    assert response.data['confirmation_code'] == 'TEST-AVAILABLE-001'
    assert response.data['status'] == ReservationStatus.CONFIRMED
    assert response.data['room_number_display'] == '202'
    assert Room.objects.count() == 2


@pytest.mark.django_db
def test_reservation_api_cannot_set_lifecycle_status_or_timestamps(setup_rooms):
    today = timezone.localdate()
    response = authenticated_client(setup_rooms['user']).post(
        '/api/v1/reservations/',
        {
            'confirmation_code': 'TEST-STATUS-INJECTION',
            'guest_name': 'Status Injection Guest',
            'guest_phone': '+251911000005',
            'room_number': '202',
            'rate_plan_name': 'Standard Rate',
            'check_in_date': str(today + timedelta(days=1)),
            'check_out_date': str(today + timedelta(days=2)),
            'status': 'CHECKED_IN',
            'actual_check_in_time': '2026-10-12T08:00:00Z',
        },
        format='json',
    )

    assert response.status_code == 201
    assert response.data['status'] == ReservationStatus.CONFIRMED
    assert response.data['actual_check_in_time'] is None

    reservation_id = response.data['id']
    update_response = authenticated_client(setup_rooms['user']).patch(
        f'/api/v1/reservations/{reservation_id}/',
        {
            'status': 'CHECKED_IN',
            'actual_check_in_time': '2026-10-12T08:00:00Z',
        },
        format='json',
    )
    assert update_response.status_code == 200
    assert update_response.data['status'] == ReservationStatus.CONFIRMED
    assert update_response.data['actual_check_in_time'] is None


@pytest.mark.django_db
def test_reservation_api_disallows_hard_delete(setup_rooms):
    today = timezone.localdate()
    reservation = Reservation.objects.create(
        confirmation_code='TEST-NO-HARD-DELETE',
        guest=setup_rooms['guest'],
        room=setup_rooms['r1'],
        rate_plan=setup_rooms['rp'],
        check_in_date=today + timedelta(days=1),
        check_out_date=today + timedelta(days=2),
        status=ReservationStatus.CONFIRMED,
        room_rate_total_etb=Decimal('5000.00'),
        service_charge_etb=Decimal('500.00'),
        vat_etb=Decimal('750.00'),
        grand_total_etb=Decimal('6250.00'),
    )

    response = authenticated_client(setup_rooms['user']).delete(
        f'/api/v1/reservations/{reservation.id}/')

    assert response.status_code == 405
    assert Reservation.objects.filter(pk=reservation.pk).exists()


@pytest.mark.django_db
def test_reservation_patch_preserves_dates_and_rejects_conflicting_room(setup_rooms):
    today = timezone.localdate()
    existing = Reservation.objects.create(
        confirmation_code='TEST-PATCH-001',
        guest=setup_rooms['guest'],
        room=setup_rooms['r1'],
        rate_plan=setup_rooms['rp'],
        check_in_date=today + timedelta(days=1),
        check_out_date=today + timedelta(days=4),
        status=ReservationStatus.CONFIRMED,
        room_rate_total_etb=Decimal('15000.00'),
        service_charge_etb=Decimal('1500.00'),
        vat_etb=Decimal('2250.00'),
        grand_total_etb=Decimal('18750.00'),
    )
    candidate = Reservation.objects.create(
        confirmation_code='TEST-PATCH-002',
        guest=setup_rooms['guest'],
        room=setup_rooms['r2'],
        rate_plan=setup_rooms['rp'],
        check_in_date=today + timedelta(days=1),
        check_out_date=today + timedelta(days=4),
        status=ReservationStatus.CONFIRMED,
        room_rate_total_etb=Decimal('15000.00'),
        service_charge_etb=Decimal('1500.00'),
        vat_etb=Decimal('2250.00'),
        grand_total_etb=Decimal('18750.00'),
    )
    client = authenticated_client(setup_rooms['user'])

    notes_response = client.patch(
        f'/api/v1/reservations/{existing.id}/',
        {'special_requests': 'Quiet room'},
        format='json',
    )
    assert notes_response.status_code == 200
    existing.refresh_from_db()
    assert existing.check_in_date == today + timedelta(days=1)
    assert existing.check_out_date == today + timedelta(days=4)

    conflict_response = client.patch(
        f'/api/v1/reservations/{candidate.id}/',
        {'room': str(setup_rooms['r1'].id)},
        format='json',
    )
    assert conflict_response.status_code == 400
    candidate.refresh_from_db()
    assert candidate.room_id == setup_rooms['r2'].id


@pytest.mark.django_db
@pytest.mark.parametrize(
    ('role', 'reservation_status', 'deposit_paid'),
    [
        (StaffRole.RECEPTIONIST, ReservationStatus.PAYMENT_PENDING, Decimal('0.00')),
        (StaffRole.FRONT_OFFICE_MANAGER,
         ReservationStatus.CONFIRMED, Decimal('500.00')),
    ],
)
def test_front_desk_staff_can_change_room_for_paid_or_unpaid_reservations(
    setup_rooms, role, reservation_status, deposit_paid,
):
    today = timezone.localdate()
    reservation = Reservation.objects.create(
        confirmation_code=f'TEST-ROOM-CHANGE-{role}',
        guest=setup_rooms['guest'],
        room=setup_rooms['r1'],
        rate_plan=setup_rooms['rp'],
        check_in_date=today + timedelta(days=1),
        check_out_date=today + timedelta(days=3),
        status=reservation_status,
        room_rate_total_etb=Decimal('10000.00'),
        service_charge_etb=Decimal('1000.00'),
        vat_etb=Decimal('1650.00'),
        grand_total_etb=Decimal('12650.00'),
        deposit_paid_etb=deposit_paid,
    )
    staff = User.objects.create_user(
        email=f'{role.lower()}-room-change@example.et',
        password='StrongPassword#2026',
        full_name='Room Change Staff',
        role=role,
    )

    response = authenticated_client(staff).patch(
        f'/api/v1/reservations/{reservation.pk}/change-room/',
        {'room_id': str(setup_rooms['r2'].pk), 'reason': 'Guest preference'},
        format='json',
    )

    assert response.status_code == 200, response.data
    reservation.refresh_from_db()
    assert reservation.room_id == setup_rooms['r2'].pk
    assert reservation.status == reservation_status
    assert reservation.room_rate_total_etb == Decimal('10000.00')
    assert reservation.service_charge_etb == Decimal('1000.00')
    assert reservation.vat_etb == Decimal('1650.00')
    assert reservation.grand_total_etb == Decimal('12650.00')
    assert reservation.deposit_paid_etb == deposit_paid
    assert AuditLog.objects.filter(
        action='RESERVATION_ROOM_CHANGED').count() == 1


@pytest.mark.django_db
def test_only_fom_can_override_uninspected_assignment_and_checkin_still_requires_inspection(setup_rooms):
    today = timezone.localdate()
    reservation = Reservation.objects.create(
        confirmation_code='TEST-ROOM-INSPECTION-OVERRIDE',
        guest=setup_rooms['guest'], room=setup_rooms['r1'], rate_plan=setup_rooms['rp'],
        check_in_date=today, check_out_date=today + timedelta(days=2),
        status=ReservationStatus.CONFIRMED,
        room_rate_total_etb=Decimal('5000.00'),
        service_charge_etb=Decimal('500.00'),
        vat_etb=Decimal('750.00'),
        grand_total_etb=Decimal('6250.00'),
        deposit_paid_etb=Decimal('500.00'),
    )
    dirty_room = setup_rooms['r2']
    dirty_room.status = RoomStatus.VACANT_DIRTY
    dirty_room.housekeeping_status = 'DIRTY'
    dirty_room.save(update_fields=['status', 'housekeeping_status'])

    receptionist = User.objects.create_user(
        email='override-receptionist@example.et', password='StrongPassword#2026',
        full_name='Override Receptionist', role=StaffRole.RECEPTIONIST,
    )
    forbidden = authenticated_client(receptionist).patch(
        f'/api/v1/reservations/{reservation.id}/change-room/',
        {
            'room_id': str(dirty_room.id), 'reason': 'Early assignment',
            'inspection_override': True,
        },
        format='json',
    )
    assert forbidden.status_code == 403

    manager = User.objects.create_user(
        email='override-fom@example.et', password='StrongPassword#2026',
        full_name='Override Front Office Manager', role=StaffRole.FRONT_OFFICE_MANAGER,
    )
    manager_client = authenticated_client(manager)
    overridden = manager_client.patch(
        f'/api/v1/reservations/{reservation.id}/change-room/',
        {
            'room_id': str(dirty_room.id), 'reason': 'Urgent room allocation',
            'inspection_override': True,
        },
        format='json',
    )
    assert overridden.status_code == 200, overridden.data
    reservation.refresh_from_db()
    dirty_room.refresh_from_db()
    assert reservation.room == dirty_room
    assert dirty_room.status == RoomStatus.VACANT_DIRTY
    assert AuditLog.objects.filter(
        action='ROOM_ASSIGNMENT_INSPECTION_OVERRIDE',
        actor_id=manager.id,
        severity='WARNING',
    ).exists()

    checkin = manager_client.post('/api/v1/reservations/check-in/', {
        'confirmation_code': reservation.confirmation_code,
    }, format='json')
    assert checkin.status_code == 409


@pytest.mark.django_db
def test_cashier_cannot_use_room_reassignment_endpoint(setup_rooms):
    today = timezone.localdate()
    reservation = Reservation.objects.create(
        confirmation_code='TEST-ROOM-CHANGE-CASHIER',
        guest=setup_rooms['guest'],
        room=setup_rooms['r1'],
        rate_plan=setup_rooms['rp'],
        check_in_date=today + timedelta(days=1),
        check_out_date=today + timedelta(days=2),
        status=ReservationStatus.PAYMENT_PENDING,
        room_rate_total_etb=Decimal('5000.00'),
        service_charge_etb=Decimal('500.00'),
        vat_etb=Decimal('825.00'),
        grand_total_etb=Decimal('6325.00'),
    )
    cashier = User.objects.create_user(
        email='cashier-room-change@example.et',
        password='StrongPassword#2026',
        full_name='Room Change Cashier',
        role=StaffRole.CASHIER,
    )

    response = authenticated_client(cashier).patch(
        f'/api/v1/reservations/{reservation.pk}/change-room/',
        {'room_id': str(setup_rooms['r2'].pk)},
        format='json',
    )

    assert response.status_code == 403
    reservation.refresh_from_db()
    assert reservation.room_id == setup_rooms['r1'].pk


@pytest.mark.django_db
def test_reservation_api_rejects_room_outside_inventory(setup_rooms):
    today = timezone.localdate()
    response = authenticated_client(setup_rooms['user']).post(
        '/api/v1/reservations/',
        {
            'confirmation_code': 'TEST-UNKNOWN-ROOM',
            'guest_name': 'Another Guest',
            'guest_phone': '+251911000003',
            'room_number': '999',
            'rate_plan_name': 'Standard Rate',
            'check_in_date': str(today + timedelta(days=1)),
            'check_out_date': str(today + timedelta(days=2)),
        },
        format='json',
    )

    assert response.status_code == 400
    assert 'room_number' in response.data
    assert not Room.objects.filter(room_number='999').exists()
