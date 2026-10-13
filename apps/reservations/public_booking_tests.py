from datetime import date, timedelta
from decimal import Decimal

import pytest
from django.core.cache import cache
from rest_framework.test import APIClient

from apps.accounts.models import StaffRole, User
from apps.audit.models import AuditLog
from apps.billing.models import Folio, Payment
from apps.guests.models import Guest
from apps.properties.models import Property
from apps.reservations.models import Reservation, ReservationStatus
from apps.rooms.models import RatePlan, Room, RoomType


@pytest.fixture
def public_booking_setup(db):
    cache.clear()
    today = date.today()
    property_config = Property.objects.create(
        name='Public Booking Hotel',
        vat_rate=Decimal('0.1500'),
        service_charge_rate=Decimal('0.1000'),
    )
    room_type = RoomType.objects.create(
        name='Public Garden Room',
        description='Garden-facing room',
        base_price_etb=Decimal('1000.00'),
        max_adults=2,
        max_children=2,
        amenities=['Wi-Fi', 'Garden view'],
    )
    room = Room.objects.create(room_number='WEB-1', room_type=room_type)
    rate_plan = RatePlan.objects.create(
        name='Public Standard', description='Public flexible rate',
        multiplier=Decimal('1.00'), is_active=True,
    )
    RatePlan.objects.create(
        name='AAA Resident Discount', description='Residents only',
        multiplier=Decimal('0.50'), is_resident_only=True, is_active=True,
    )
    return {
        'today': today,
        'property': property_config,
        'room': room,
        'rate_plan': rate_plan,
    }


def public_client():
    return APIClient()


@pytest.mark.django_db
def test_anonymous_guest_can_search_and_create_server_priced_booking(public_booking_setup):
    setup = public_booking_setup
    check_in = setup['today'] + timedelta(days=3)
    check_out = check_in + timedelta(days=2)
    client = public_client()

    internal_availability = client.get(
        '/api/v1/rooms/availability/',
        {'check_in': str(check_in), 'check_out': str(check_out)},
    )
    assert internal_availability.status_code == 401

    availability = client.get(
        '/api/v1/rooms/public-availability/',
        {'check_in': str(check_in), 'check_out': str(check_out)},
    )
    assert availability.status_code == 200, availability.data
    assert len(availability.data) == 1
    assert availability.data[0]['room_type']['name'] == 'Public Garden Room'
    assert 'room_number' not in availability.data[0]
    assert 'status' not in availability.data[0]

    public_info = client.get('/api/v1/reservations/public-info/')
    assert public_info.status_code == 200, public_info.data
    assert public_info.data['property_name'] == 'Public Booking Hotel'
    assert public_info.data['rate_plan']['name'] == 'Public Standard'

    quote = client.get(
        '/api/v1/reservations/public-quote/',
        {
            'room_id': str(setup['room'].id),
            'check_in': str(check_in),
            'check_out': str(check_out),
            'adults': 2,
            'children': 1,
        },
    )
    assert quote.status_code == 200, quote.data
    assert quote.data['room_subtotal_etb'] == '2000.00'
    assert quote.data['service_charge_etb'] == '200.00'
    assert quote.data['vat_etb'] == '330.00'
    assert quote.data['grand_total_etb'] == '2530.00'
    assert quote.data['rate_plan'] == 'Public Standard'

    booking = client.post(
        '/api/v1/reservations/public-booking/',
        {
            'room_id': str(setup['room'].id),
            'check_in_date': str(check_in),
            'check_out_date': str(check_out),
            'adults': 2,
            'children': 1,
            'guest_name': 'Public Guest',
            'guest_email': 'public@example.et',
            'guest_phone': '+251911100010',
            'nationality': 'Ethiopian',
            'special_requests': 'Quiet room, please',
            'privacy_consent': True,
            'grand_total_etb': '1.00',
        },
        format='json',
    )
    assert booking.status_code == 201, booking.data
    assert booking.data['success'] is True
    assert booking.data['deposit_required'] is True
    reservation = Reservation.objects.get(pk=booking.data['reservation']['id'])
    assert reservation.status == ReservationStatus.PAYMENT_PENDING
    assert reservation.source == 'WEBSITE'
    assert reservation.room_rate_total_etb == Decimal('2000.00')
    assert reservation.service_charge_etb == Decimal('200.00')
    assert reservation.vat_etb == Decimal('330.00')
    assert reservation.grand_total_etb == Decimal('2530.00')
    assert reservation.deposit_paid_etb == Decimal('0.00')
    guest = Guest.objects.get(pk=reservation.guest_id)
    assert guest.id_number == ''
    assert guest.privacy_consent_given is True
    assert AuditLog.objects.filter(
        action='PUBLIC_RESERVATION_CREATED').count() == 1

    staff = User.objects.create_user(
        email='frontdesk-public-test@example.et',
        password='StrongPassword#2026',
        full_name='Public Booking Front Desk',
        role=StaffRole.RECEPTIONIST,
    )
    staff_client = APIClient()
    staff_client.force_authenticate(user=staff)
    hotel_reservations = staff_client.get('/api/v1/reservations/')
    assert hotel_reservations.status_code == 200
    assert any(
        item['confirmation_code'] == reservation.confirmation_code
        and item['source'] == 'WEBSITE'
        and item['status'] == ReservationStatus.PAYMENT_PENDING
        for item in hotel_reservations.data
    )

    check_in_without_deposit = staff_client.post(
        '/api/v1/reservations/check-in/',
        {'confirmation_code': reservation.confirmation_code},
        format='json',
    )
    assert check_in_without_deposit.status_code == 409

    zero_deposit = staff_client.post(
        '/api/v1/reservations/record-deposit/',
        {
            'confirmation_code': reservation.confirmation_code,
            'amount': '0.00',
            'method': 'CASH',
        },
        format='json',
    )
    assert zero_deposit.status_code == 400
    reservation.refresh_from_db()
    assert reservation.status == ReservationStatus.PAYMENT_PENDING

    record_deposit = staff_client.post(
        '/api/v1/reservations/record-deposit/',
        {
            'confirmation_code': reservation.confirmation_code,
            'amount': '500.00',
            'method': 'CASH',
            'reference': 'FRONT-DESK-RECEIPT-1',
        },
        format='json',
    )
    assert record_deposit.status_code == 200, record_deposit.data
    reservation.refresh_from_db()
    assert reservation.status == ReservationStatus.CONFIRMED
    assert reservation.deposit_paid_etb == Decimal('500.00')
    assert Payment.objects.filter(
        folio__reservation=reservation,
        amount=Decimal('500.00'),
        method='CASH',
        status='COMPLETED',
    ).exists()
    assert AuditLog.objects.filter(
        action='RESERVATION_DEPOSIT_RECORDED').count() == 1
    confirmed_list = staff_client.get('/api/v1/reservations/')
    assert next(
        item for item in confirmed_list.data
        if item['confirmation_code'] == reservation.confirmation_code
    )['status'] == ReservationStatus.CONFIRMED

    repeated_booking = client.post(
        '/api/v1/reservations/public-booking/',
        {
            'room_id': str(setup['room'].id),
            'check_in_date': str(check_in),
            'check_out_date': str(check_out),
            'adults': 2,
            'children': 1,
            'guest_name': 'Second Guest',
            'guest_phone': '+251911100011',
            'privacy_consent': True,
        },
        format='json',
    )
    assert repeated_booking.status_code == 409
    assert Reservation.objects.count() == 1


@pytest.mark.django_db
def test_public_booking_requires_consent_and_keeps_staff_reservation_list_private(public_booking_setup):
    setup = public_booking_setup
    check_in = setup['today'] + timedelta(days=5)
    check_out = check_in + timedelta(days=1)
    client = public_client()

    private_list = client.get('/api/v1/reservations/')
    assert private_list.status_code == 401

    response = client.post(
        '/api/v1/reservations/public-booking/',
        {
            'room_id': str(setup['room'].id),
            'check_in_date': str(check_in),
            'check_out_date': str(check_out),
            'adults': 1,
            'children': 0,
            'guest_name': 'Guest Declining Consent',
            'guest_phone': '+251911100012',
            'privacy_consent': False,
        },
        format='json',
    )
    assert response.status_code == 400
    assert Reservation.objects.count() == 0
    assert Guest.objects.count() == 0


@pytest.mark.django_db
def test_pending_request_does_not_hold_room_and_deposit_rechecks_availability(public_booking_setup):
    setup = public_booking_setup
    check_in = setup['today'] + timedelta(days=7)
    check_out = check_in + timedelta(days=2)
    client = public_client()

    def book(name, phone):
        return client.post(
            '/api/v1/reservations/public-booking/',
            {
                'room_id': str(setup['room'].id),
                'check_in_date': str(check_in),
                'check_out_date': str(check_out),
                'adults': 1,
                'children': 0,
                'guest_name': name,
                'guest_phone': phone,
                'privacy_consent': True,
            },
            format='json',
        )

    first = book('First Pending Guest', '+251911100021')
    second = book('Second Pending Guest', '+251911100022')
    assert first.status_code == 201
    assert second.status_code == 201
    first_reservation = Reservation.objects.get(
        pk=first.data['reservation']['id'])
    second_reservation = Reservation.objects.get(
        pk=second.data['reservation']['id'])
    assert first_reservation.status == ReservationStatus.PAYMENT_PENDING
    assert second_reservation.status == ReservationStatus.PAYMENT_PENDING

    staff = User.objects.create_user(
        email='deposit-conflict-frontdesk@example.et',
        password='StrongPassword#2026',
        full_name='Deposit Conflict Front Desk',
        role=StaffRole.RECEPTIONIST,
    )
    competing_booking = Reservation.objects.create(
        confirmation_code='STAFF-SECURED-ROOM',
        guest=Guest.objects.create(
            full_name='Secured Guest', phone_number='+251911100023', id_number=''),
        room=setup['room'],
        rate_plan=setup['rate_plan'],
        check_in_date=check_in,
        check_out_date=check_out,
        status=ReservationStatus.CONFIRMED,
        room_rate_total_etb=Decimal('2000.00'),
        service_charge_etb=Decimal('200.00'),
        vat_etb=Decimal('330.00'),
        grand_total_etb=Decimal('2530.00'),
    )
    assert competing_booking.status == ReservationStatus.CONFIRMED

    staff_client = APIClient()
    staff_client.force_authenticate(user=staff)
    first_deposit = staff_client.post(
        '/api/v1/reservations/record-deposit/',
        {
            'confirmation_code': first_reservation.confirmation_code,
            'amount': '500.00',
            'method': 'CASH',
        },
        format='json',
    )
    assert first_deposit.status_code == 409
    first_reservation.refresh_from_db()
    assert first_reservation.status == ReservationStatus.PAYMENT_PENDING
    assert first_reservation.deposit_paid_etb == Decimal('0.00')
