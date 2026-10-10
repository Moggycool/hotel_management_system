import pytest
from decimal import Decimal
from datetime import date, timedelta
from apps.rooms.models import RoomType, Room, RatePlan, RoomStatus
from apps.rooms.services import AvailabilityEngine
from apps.guests.models import Guest, IDType
from apps.reservations.models import Reservation, BookingSource, ReservationStatus


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

    return {'rt': rt, 'r1': r1, 'r2': r2, 'rp': rp, 'guest': guest}


@pytest.mark.django_db
def test_availability_engine_excludes_overlapping_reservations(setup_rooms):
    today = date.today()
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
def test_rate_plan_discount_calculation(setup_rooms):
    resident_rate = RatePlan.objects.create(
        name='Resident 15% Off',
        multiplier=Decimal('0.85'),
        is_resident_only=True,
    )
    base_price = Decimal('5000.00')
    calculated = resident_rate.calculate_nightly_rate(base_price)
    assert calculated == Decimal('4250.00')
