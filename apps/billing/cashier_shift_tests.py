from datetime import date, timedelta
from decimal import Decimal

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import StaffRole, User
from apps.audit.models import AuditLog
from apps.billing.models import CashierShift, Folio, Payment
from apps.guests.models import Guest
from apps.properties.models import Property
from apps.reservations.models import Reservation
from apps.restaurant.models import RestaurantOrder
from apps.rooms.models import RatePlan, Room, RoomType


@pytest.fixture
def shift_setup(db):
    cashier = User.objects.create_user(
        email='shift-cashier@example.et',
        password='StrongPassword#2026',
        full_name='Shift Cashier',
        role=StaffRole.CASHIER,
    )
    other_cashier = User.objects.create_user(
        email='other-cashier@example.et',
        password='StrongPassword#2026',
        full_name='Other Cashier',
        role=StaffRole.CASHIER,
    )
    manager = User.objects.create_user(
        email='shift-manager@example.et',
        password='StrongPassword#2026',
        full_name='Shift Manager',
        role=StaffRole.GENERAL_MANAGER,
    )
    property_config = Property.objects.create(
        current_business_date=date.today())
    room_type = RoomType.objects.create(
        name='Shift Test Room', description='Test room', base_price_etb=Decimal('100.00'))
    room = Room.objects.create(room_number='SHIFT-1', room_type=room_type)
    guest = Guest.objects.create(
        full_name='Shift Guest', phone_number='+251911100001', id_number='SHIFT-1')
    rate_plan = RatePlan.objects.create(
        name='Shift Rate', description='Test rate')
    reservation = Reservation.objects.create(
        confirmation_code='SHIFT-RES-1', guest=guest, room=room,
        rate_plan=rate_plan, check_in_date=date.today(),
        check_out_date=date.today() + timedelta(days=1),
        room_rate_total_etb=Decimal('100.00'),
        service_charge_etb=Decimal('10.00'), vat_etb=Decimal('15.00'),
        grand_total_etb=Decimal('125.00'),
    )
    folio = Folio.objects.create(reservation=reservation, guest=guest)
    return {
        'cashier': cashier,
        'other_cashier': other_cashier,
        'manager': manager,
        'property': property_config,
        'folio': folio,
    }


def client_for(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.mark.django_db
def test_cashier_shift_open_close_uses_payments_and_audits(shift_setup):
    cashier = shift_setup['cashier']
    open_response = client_for(cashier).post(
        '/api/v1/billing/shifts/open/',
        {
            'shift_name': 'Morning Shift (06:00 - 14:00)',
            'opening_float': '1000.00',
        },
        format='json',
    )
    assert open_response.status_code == 201, open_response.data
    shift_id = open_response.data['id']
    shift = CashierShift.objects.get(pk=shift_id)
    assert shift.cashier == cashier
    assert shift.cashier_name == cashier.full_name
    assert AuditLog.objects.filter(action='CASHIER_SHIFT_OPENED').count() == 1

    Payment.objects.create(
        folio=shift_setup['folio'], method='CASH', amount=Decimal('125.00'),
        status='COMPLETED', out_trade_no='SHIFT-PAY-CASH-1', received_by=cashier,
        completed_at=timezone.now())
    Payment.objects.create(
        folio=shift_setup['folio'], method='TELEBIRR', amount=Decimal('80.00'),
        status='COMPLETED', out_trade_no='SHIFT-PAY-TEL-1', received_by=cashier,
        created_at=timezone.now() - timedelta(days=1), completed_at=timezone.now())
    Payment.objects.create(
        folio=shift_setup['folio'], method='CARD', amount=Decimal('45.00'),
        status='COMPLETED', out_trade_no='SHIFT-PAY-CARD-1', received_by=cashier,
        completed_at=timezone.now())
    Payment.objects.create(
        folio=shift_setup['folio'], method='CASH', amount=Decimal('999.00'),
        status='PENDING', out_trade_no='SHIFT-PAY-PENDING-1', received_by=cashier)
    RestaurantOrder.objects.create(
        order_number='SHIFT-POS-1', kot_number='SHIFT-KOT-1',
        order_type='DINE_IN', outlet='Restaurant', subtotal=Decimal('50.00'),
        grand_total=Decimal('50.00'), status='SETTLED', payment_method='TELEBIRR',
        settled_at=timezone.now(), settled_by=cashier,
    )

    close_response = client_for(cashier).post(
        f'/api/v1/billing/shifts/{shift_id}/close/',
        {'actual_closing_cash': '1125.00'},
        format='json',
    )
    assert close_response.status_code == 200, close_response.data
    assert close_response.data['cash_collected'] == Decimal('125.00')
    assert close_response.data['telebirr_collected'] == Decimal('130.00')
    assert close_response.data['cbe_card_collected'] == Decimal('45.00')
    assert close_response.data['discrepancy'] == '0.00'
    assert AuditLog.objects.filter(action='CASHIER_SHIFT_CLOSED').count() == 1


@pytest.mark.django_db
def test_shift_slot_is_unique_and_other_cashier_cannot_close(shift_setup):
    cashier = shift_setup['cashier']
    opened = client_for(cashier).post(
        '/api/v1/billing/shifts/open/',
        {
            'shift_name': 'Afternoon Shift (14:00 - 22:00)',
            'opening_float': '500.00',
        },
        format='json',
    )
    assert opened.status_code == 201

    duplicate = client_for(shift_setup['other_cashier']).post(
        '/api/v1/billing/shifts/open/',
        {
            'shift_name': 'Afternoon Shift (14:00 - 22:00)',
            'opening_float': '700.00',
        },
        format='json',
    )
    assert duplicate.status_code == 409
    assert CashierShift.objects.count() == 1

    unauthorized_close = client_for(shift_setup['other_cashier']).post(
        f"/api/v1/billing/shifts/{opened.data['id']}/close/",
        {'actual_closing_cash': '500.00'},
        format='json',
    )
    assert unauthorized_close.status_code == 403


@pytest.mark.django_db
def test_discrepancy_requires_reason_and_manager_can_close(shift_setup):
    cashier = shift_setup['cashier']
    opened = client_for(cashier).post(
        '/api/v1/billing/shifts/open/',
        {
            'shift_name': 'Night Audit Shift (22:00 - 06:00)',
            'opening_float': '1000.00',
        },
        format='json',
    )
    shift_id = opened.data['id']

    missing_reason = client_for(cashier).post(
        f'/api/v1/billing/shifts/{shift_id}/close/',
        {'actual_closing_cash': '900.00'},
        format='json',
    )
    assert missing_reason.status_code == 400
    assert CashierShift.objects.get(pk=shift_id).status == 'OPEN'

    manager_close = client_for(shift_setup['manager']).post(
        f'/api/v1/billing/shifts/{shift_id}/close/',
        {
            'actual_closing_cash': '900.00',
            'handover_notes': 'Shortage documented at handover.',
        },
        format='json',
    )
    assert manager_close.status_code == 200, manager_close.data
    assert manager_close.data['discrepancy'] == '-100.00'
    shift = CashierShift.objects.get(pk=shift_id)
    assert shift.closed_by == shift_setup['manager']
    assert shift.handover_notes == 'Shortage documented at handover.'
