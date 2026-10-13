from datetime import timedelta
from decimal import Decimal

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import StaffRole, User
from apps.audit.models import AuditLog
from apps.billing.models import Folio, FolioItem, Payment
from apps.guests.models import Guest
from apps.properties.models import Property
from apps.reporting.models import AuditSessionStatus, NightAuditSession
from apps.reservations.models import Reservation, ReservationStatus
from apps.restaurant.models import RestaurantOrder
from apps.rooms.models import Room, RoomStatus, RoomType, RatePlan


@pytest.mark.django_db
def test_night_audit_is_idempotent_and_uses_persisted_payments():
    auditor = User.objects.create_user(
        email='audit-manager@example.et',
        password='StrongPassword#2026',
        full_name='Audit Manager',
        role=StaffRole.GENERAL_MANAGER,
    )
    property_config = Property.objects.create(
        name='Audit Test Hotel', vat_rate=Decimal('0.1500'),
        service_charge_rate=Decimal('0.1000'))
    room_type = RoomType.objects.create(
        name='Audit Room', description='Test room', base_price_etb=Decimal('5000.00'))
    room = Room.objects.create(
        room_number='901', room_type=room_type, status=RoomStatus.OCCUPIED)
    guest = Guest.objects.create(
        full_name='Audit Guest', phone_number='+251911009901', id_number='AUD-901')
    rate_plan = RatePlan.objects.create(
        name='Audit Flexible', description='Test rate')
    business_date = timezone.localdate()
    reservation = Reservation.objects.create(
        confirmation_code='AUDIT-IDEMPOTENT-901',
        guest=guest,
        room=room,
        rate_plan=rate_plan,
        check_in_date=business_date - timedelta(days=1),
        check_out_date=business_date + timedelta(days=1),
        status=ReservationStatus.CHECKED_IN,
        room_rate_total_etb=Decimal('1000.00'),
        service_charge_etb=Decimal('100.00'),
        vat_etb=Decimal('150.00'),
        grand_total_etb=Decimal('1250.00'),
    )
    folio = Folio.objects.create(reservation=reservation, guest=guest)
    Payment.objects.create(
        folio=folio,
        method='CASH',
        amount=Decimal('321.00'),
        status='COMPLETED',
        out_trade_no='AUDIT-CASH-901',
        created_at=timezone.now(),
    )

    client = APIClient()
    client.force_authenticate(user=auditor)
    payload = {
        'business_date': str(business_date),
        'closed_by': auditor.full_name,
        'auditor_role': auditor.get_role_display(),
        'process_no_shows': False,
    }
    first_response = client.post(
        '/api/v1/reporting/night-audit/execute/', payload, format='json')
    assert first_response.status_code == 200, first_response.data
    assert first_response.data['success'] is True

    session = NightAuditSession.objects.get(business_date=business_date)
    assert AuditLog.objects.filter(
        action='NIGHT_AUDIT_BUSINESS_DATE_CLOSE').count() == 1

    patch_response = client.patch(
        f'/api/v1/reporting/night-audit/{session.id}/',
        {'notes': 'tampered'},
        format='json',
    )
    delete_response = client.delete(
        f'/api/v1/reporting/night-audit/{session.id}/')
    assert patch_response.status_code == 405
    assert delete_response.status_code == 405
    room_charge_reference = f'NIGHT_AUDIT:{business_date}:{reservation.pk}'
    assert FolioItem.objects.filter(
        folio=folio, reference_id=room_charge_reference).count() == 1
    assert session.room_revenue_etb == Decimal('500.00')
    assert session.cash_settled_etb == Decimal('321.00')
    assert session.telebirr_settled_etb == Decimal('0.00')
    property_config.refresh_from_db()
    assert property_config.current_business_date == business_date + \
        timedelta(days=1)
    assert AuditLog.objects.filter(
        action='NIGHT_AUDIT_BUSINESS_DATE_CLOSE').count() == 1

    second_response = client.post(
        '/api/v1/reporting/night-audit/execute/', payload, format='json')
    assert second_response.status_code == 200
    assert second_response.data['already_closed'] is True
    assert NightAuditSession.objects.filter(
        business_date=business_date).count() == 1
    assert FolioItem.objects.filter(
        folio=folio, reference_id=room_charge_reference).count() == 1
    assert AuditLog.objects.filter(
        action='NIGHT_AUDIT_BUSINESS_DATE_CLOSE').count() == 1
    assert session.status == AuditSessionStatus.COMPLETED


@pytest.mark.django_db
def test_restaurant_revenue_is_not_taxed_twice_in_reports():
    auditor = User.objects.create_user(
        email='audit-fb@example.et',
        password='StrongPassword#2026',
        full_name='Audit F&B Manager',
        role=StaffRole.GENERAL_MANAGER,
    )
    Property.objects.create(
        name='F&B Audit Hotel',
        vat_rate=Decimal('0.1500'),
        service_charge_rate=Decimal('0.1000'),
    )
    business_date = timezone.localdate()
    RestaurantOrder.objects.create(
        order_number='FB-AUDIT-001',
        kot_number='FB-KOT-001',
        order_type='DINE_IN',
        outlet='Restaurant',
        subtotal=Decimal('100.00'),
        service_charge=Decimal('10.00'),
        vat_amount=Decimal('16.50'),
        grand_total=Decimal('126.50'),
        status='SETTLED',
        settled_at=timezone.now(),
    )

    client = APIClient()
    client.force_authenticate(user=auditor)
    date_query = f'?date={business_date}'
    flash_response = client.get(
        f'/api/v1/reporting/night-audit/daily-flash/{date_query}')
    assert flash_response.status_code == 200
    flash_revenue = flash_response.data['revenue_breakdown']
    assert flash_revenue['food_and_beverage_etb'] == 100.0
    assert flash_revenue['service_charge_etb'] == 10.0
    assert flash_revenue['vat_15_percent_etb'] == 16.5
    assert flash_revenue['gross_total_etb'] == 126.5

    close_response = client.post(
        '/api/v1/reporting/night-audit/execute/',
        {'business_date': str(business_date), 'process_no_shows': False},
        format='json',
    )
    assert close_response.status_code == 200, close_response.data
    session = NightAuditSession.objects.get(business_date=business_date)
    assert session.fb_revenue_etb == Decimal('100.00')
    assert session.service_charge_etb == Decimal('10.00')
    assert session.vat_etb == Decimal('16.50')
    assert session.gross_revenue_etb == Decimal('126.50')
