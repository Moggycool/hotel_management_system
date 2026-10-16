import pytest
from decimal import Decimal
from datetime import date, timedelta
from django.utils import timezone
from apps.accounts.models import StaffRole, User
from apps.rooms.models import RoomType, Room, RatePlan, RoomStatus
from apps.rooms.services import AvailabilityEngine
from apps.guests.models import Guest, IDType
from apps.reservations.models import Reservation, BookingSource, ReservationStatus
from apps.housekeeping.models import HousekeepingTask
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
def test_room_api_creates_and_updates_room(setup_rooms):
    client = authenticated_client(setup_rooms['user'])
    response = client.post(
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

    assert response.status_code == 201
    assert response.data['room_number'] == '203'
    assert response.data['room_type']['id'] == str(setup_rooms['rt'].id)

    update_response = client.patch(
        f"/api/v1/rooms/{response.data['id']}/",
        {'status': RoomStatus.MAINTENANCE, 'notes': 'Repair required'},
        format='json',
    )

    assert update_response.status_code == 200
    assert update_response.data['status'] == RoomStatus.MAINTENANCE
    assert update_response.data['notes'] == 'Repair required'


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
        {'room_id': str(setup_rooms['r2'].pk)},
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
