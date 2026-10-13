from datetime import date, timedelta
from decimal import Decimal

import pytest
from rest_framework.test import APIClient

from apps.accounts.models import StaffRole, User
from apps.audit.models import AuditLog, AuditModule
from apps.billing.models import Folio, Payment
from apps.guests.models import Guest
from apps.reservations.models import Reservation
from apps.rooms.models import RatePlan, Room, RoomType


@pytest.mark.django_db
def test_folio_charge_and_payment_confirmation_are_audited():
    receptionist = User.objects.create_user(
        email='reception-audit@example.et', password='StrongPassword#2026',
        full_name='Audit Receptionist', role=StaffRole.RECEPTIONIST,
    )
    cashier = User.objects.create_user(
        email='cashier-audit@example.et', password='StrongPassword#2026',
        full_name='Audit Cashier', role=StaffRole.CASHIER,
    )
    room_type = RoomType.objects.create(
        name='Audit Standard', description='Test room', base_price_etb=Decimal('5000.00'))
    room = Room.objects.create(room_number='701', room_type=room_type)
    guest = Guest.objects.create(
        full_name='Audit Guest', phone_number='+251911000701', id_number='AUDIT-701')
    rate_plan = RatePlan.objects.create(
        name='Audit Rate', description='Test rate')
    reservation = Reservation.objects.create(
        confirmation_code='AUDIT-RES-701', guest=guest, room=room, rate_plan=rate_plan,
        check_in_date=date.today(), check_out_date=date.today() + timedelta(days=1),
        room_rate_total_etb=Decimal('5000.00'), service_charge_etb=Decimal('500.00'),
        vat_etb=Decimal('750.00'), grand_total_etb=Decimal('6250.00'))
    folio = Folio.objects.create(reservation=reservation, guest=guest)

    receptionist_client = APIClient()
    receptionist_client.force_authenticate(user=receptionist)
    charge_response = receptionist_client.post(
        f'/api/v1/billing/folios/{folio.id}/post-charge/',
        {
            'folio': str(folio.id),
            'category': 'RESTAURANT',
            'description': 'Dinner',
            'amount': '450.00',
        },
        format='json',
    )
    assert charge_response.status_code == 201, charge_response.data
    charge_log = AuditLog.objects.get(action='FOLIO_CHARGE_POSTED')
    assert charge_log.module == AuditModule.FOLIO
    assert charge_log.actor_id == receptionist.id
    assert charge_log.after_state['amount'] == '450.00'

    payment = Payment.objects.create(
        folio=folio, method='CASH', amount=Decimal('450.00'),
        out_trade_no='AUDIT-PAYMENT-701', status='PENDING')
    cashier_client = APIClient()
    cashier_client.force_authenticate(user=cashier)
    confirm_response = cashier_client.post(
        f'/api/v1/billing/folios/{folio.id}/confirm-payment/',
        {'payment_id': str(payment.id)},
        format='json',
    )
    assert confirm_response.status_code == 200
    payment.refresh_from_db()
    assert payment.status == 'COMPLETED'
    assert payment.received_by == cashier
    payment_log = AuditLog.objects.get(action='PAYMENT_CONFIRMED')
    assert payment_log.actor_id == cashier.id
    assert payment_log.before_state['status'] == 'PENDING'
    assert payment_log.after_state['status'] == 'COMPLETED'
