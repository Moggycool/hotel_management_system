import hashlib
from datetime import date, timedelta
from decimal import Decimal

from django.db import transaction
from django.db.models import Sum
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.accounts.permissions import IsNightAuditStaff
from apps.audit.models import AuditModule
from apps.audit.services import log_audit_event
from apps.billing.models import Folio, FolioItem, Payment
from apps.properties.models import Property
from apps.reporting.models import AuditSessionStatus, NightAuditSession
from apps.reporting.serializers import ExecuteAuditPayloadSerializer, NightAuditSessionSerializer
from apps.reservations.models import Reservation, ReservationStatus
from apps.restaurant.models import RestaurantOrder
from apps.rooms.models import Room, RoomStatus

CENT = Decimal('0.01')


class NightAuditViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = NightAuditSession.objects.all()
    serializer_class = NightAuditSessionSerializer
    permission_classes = [IsNightAuditStaff]

    @action(detail=False, methods=['get'], url_path='checklist')
    def pre_audit_checklist(self, request):
        business_date = self._parse_date(
            request.query_params.get('date')) or timezone.localdate()
        pending_arrivals = list(Reservation.objects.filter(
            check_in_date=business_date, status=ReservationStatus.CONFIRMED,
        ).values('id', 'confirmation_code', 'guest__full_name', 'room__room_number', 'grand_total_etb'))
        overdue_departures = list(Reservation.objects.filter(
            check_out_date__lte=business_date, status=ReservationStatus.CHECKED_IN,
        ).values('id', 'confirmation_code', 'guest__full_name', 'room__room_number', 'check_out_date'))
        in_house = list(Reservation.objects.filter(
            status=ReservationStatus.CHECKED_IN,
            check_in_date__lte=business_date,
            check_out_date__gt=business_date,
        ).values('id', 'confirmation_code', 'guest__full_name', 'room__room_number', 'room_rate_total_etb'))
        total_rooms = Room.objects.filter(is_active=True).count()
        occupied_rooms = len({stay['room__room_number'] for stay in in_house})
        dirty_rooms = Room.objects.filter(
            status=RoomStatus.VACANT_DIRTY).count()
        existing = NightAuditSession.objects.filter(
            business_date=business_date).first()
        already_closed = bool(existing and existing.status ==
                              AuditSessionStatus.COMPLETED)

        return Response({
            'business_date': str(business_date),
            'is_ready_to_close': not pending_arrivals and not overdue_departures and not already_closed,
            'already_closed': already_closed,
            'summary': {
                'total_rooms': total_rooms,
                'occupied_rooms': occupied_rooms,
                'occupancy_percent': round(occupied_rooms / total_rooms * 100, 1) if total_rooms else 0,
                'dirty_rooms': dirty_rooms,
                'pending_arrivals_count': len(pending_arrivals),
                'overdue_departures_count': len(overdue_departures),
                'in_house_stays_count': len(in_house),
            },
            'pending_arrivals': pending_arrivals,
            'overdue_departures': overdue_departures,
            'in_house_stays': in_house,
        })

    @action(detail=False, methods=['post'], url_path='execute')
    @transaction.atomic
    def execute_night_audit(self, request):
        serializer = ExecuteAuditPayloadSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        data = serializer.validated_data
        business_date = data['business_date']
        next_date = data.get(
            'next_business_date') or business_date + timedelta(days=1)
        closed_by = data.get('closed_by') or request.user.full_name
        auditor_role = data.get(
            'auditor_role') or request.user.get_role_display()

        property_config = Property.objects.select_for_update().order_by('created_at').first()
        if property_config is None:
            property_config = Property.objects.create()
        existing = NightAuditSession.objects.filter(
            business_date=business_date).first()
        if existing and existing.status == AuditSessionStatus.COMPLETED:
            return Response({
                'success': True,
                'already_closed': True,
                'message': f'Business date {business_date} was already closed; no additional entries were posted.',
                'session': NightAuditSessionSerializer(existing).data,
            })

        no_show_count = 0
        if data.get('process_no_shows', True):
            pending = Reservation.objects.select_for_update().filter(
                check_in_date=business_date, status=ReservationStatus.CONFIRMED,
            )
            for reservation in pending:
                reservation.status = ReservationStatus.NO_SHOW
                reservation.save(update_fields=['status', 'updated_at'])
                no_show_count += 1
                log_audit_event(
                    module=AuditModule.RESERVATION,
                    action='RESERVATION_MARKED_NO_SHOW',
                    details=f'Reservation {reservation.confirmation_code} marked no-show by night audit.',
                    request=request,
                    after_state={'status': reservation.status,
                                 'business_date': str(business_date)},
                )

        in_house = list(Reservation.objects.select_for_update().filter(
            status=ReservationStatus.CHECKED_IN,
            check_in_date__lte=business_date,
            check_out_date__gt=business_date,
        ).select_related('room', 'guest'))
        total_rooms = Room.objects.filter(is_active=True).count()
        occupied_rooms = len({reservation.room_id for reservation in in_house})
        room_revenue = Decimal('0.00')
        posted_count = 0
        for reservation in in_house:
            nightly_rate = (reservation.room_rate_total_etb /
                            Decimal(str(reservation.nights))).quantize(CENT)
            folio, _ = Folio.objects.get_or_create(reservation=reservation, defaults={
                                                   'guest': reservation.guest})
            reference_id = f'NIGHT_AUDIT:{business_date}:{reservation.pk}'
            _, created = FolioItem.objects.get_or_create(
                folio=folio,
                reference_id=reference_id,
                defaults={
                    'category': 'ROOM',
                    'description': f'Nightly room charge - room {reservation.room.room_number} ({business_date})',
                    'amount': nightly_rate,
                    'posted_by': request.user,
                },
            )
            room_revenue += nightly_rate
            if created:
                posted_count += 1
                log_audit_event(
                    module=AuditModule.FOLIO,
                    action='NIGHT_AUDIT_ROOM_CHARGE_POSTED',
                    details=f'Nightly room charge posted for reservation {reservation.confirmation_code}.',
                    request=request,
                    after_state={'folio_id': str(
                        folio.pk), 'reference_id': reference_id, 'amount': str(nightly_rate)},
                )

        revenue = {key: Decimal('0.00') for key in (
            'RESTAURANT', 'MINIBAR', 'SPA', 'TRANSFER', 'MISC')}
        for item in FolioItem.objects.filter(posted_at__date=business_date):
            if item.category in revenue:
                revenue[item.category] += item.amount
        outlet_dining = RestaurantOrder.objects.filter(
            status='SETTLED', settled_at__date=business_date,
        ).aggregate(total=Sum('subtotal'))['total'] or Decimal('0.00')
        fb_revenue = revenue['RESTAURANT'] + revenue['MINIBAR'] + outlet_dining
        spa_revenue = revenue['SPA']
        transport_revenue = revenue['TRANSFER']
        misc_revenue = revenue['MISC']
        room_revenue += FolioItem.objects.filter(
            posted_at__date=business_date, category='ROOM',
        ).exclude(reference_id__startswith='NIGHT_AUDIT:').aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

        taxable_base = room_revenue + fb_revenue + \
            spa_revenue + transport_revenue + misc_revenue
        service_charge = (
            taxable_base * property_config.service_charge_rate).quantize(CENT)
        vat = ((taxable_base + service_charge) *
               property_config.vat_rate).quantize(CENT)
        gross_revenue = taxable_base + service_charge + vat
        completed_payments = Payment.objects.filter(
            status='COMPLETED', created_at__date=business_date)
        telebirr = completed_payments.filter(method='TELEBIRR').aggregate(
            total=Sum('amount'))['total'] or Decimal('0.00')
        cash = completed_payments.filter(method='CASH').aggregate(
            total=Sum('amount'))['total'] or Decimal('0.00')
        cbe_card = completed_payments.filter(method__in=['CBE_BIRR', 'CARD']).aggregate(
            total=Sum('amount'))['total'] or Decimal('0.00')
        bank_transfer = completed_payments.filter(method='BANK_TRANSFER').aggregate(
            total=Sum('amount'))['total'] or Decimal('0.00')

        occupancy = Decimal(str(round(
            occupied_rooms / total_rooms * 100, 2))) if total_rooms else Decimal('0.00')
        adr = (room_revenue / Decimal(str(occupied_rooms))
               ).quantize(CENT) if occupied_rooms else Decimal('0.00')
        revpar = (room_revenue / Decimal(str(total_rooms))
                  ).quantize(CENT) if total_rooms else Decimal('0.00')
        checksum_input = f'{business_date}:{gross_revenue}:{closed_by}:{occupied_rooms}:{posted_count}'
        checksum = hashlib.sha256(checksum_input.encode()).hexdigest().upper()

        session = NightAuditSession.objects.create(
            business_date=business_date,
            next_business_date=next_date,
            closed_by=closed_by,
            auditor_role=auditor_role,
            status=AuditSessionStatus.COMPLETED,
            total_rooms=total_rooms,
            occupied_rooms=occupied_rooms,
            occupancy_rate=occupancy,
            adr_etb=adr,
            revpar_etb=revpar,
            room_revenue_etb=room_revenue,
            fb_revenue_etb=fb_revenue,
            spa_revenue_etb=spa_revenue,
            transport_revenue_etb=transport_revenue,
            misc_revenue_etb=misc_revenue,
            service_charge_etb=service_charge,
            vat_etb=vat,
            gross_revenue_etb=gross_revenue,
            telebirr_settled_etb=telebirr,
            cash_settled_etb=cash,
            cbe_card_settled_etb=cbe_card,
            bank_transfer_settled_etb=bank_transfer,
            posted_room_charges_count=posted_count,
            no_shows_processed_count=no_show_count,
            audit_checksum=checksum,
            notes=data.get(
                'notes') or f'Night Audit completed for {business_date}. Rolled to {next_date}.',
            snapshot_data=data.get('snapshot_data', {}),
        )
        property_config.current_business_date = next_date
        property_config.save(
            update_fields=['current_business_date', 'updated_at'])
        log_audit_event(
            module=AuditModule.NIGHT_AUDIT,
            action='NIGHT_AUDIT_BUSINESS_DATE_CLOSE',
            details=f'Business date {business_date} closed. Gross revenue {gross_revenue} ETB; audit checksum {checksum}.',
            request=request,
            after_state={
                'business_date': str(business_date),
                'next_business_date': str(next_date),
                'gross_revenue_etb': str(gross_revenue),
                'occupancy_rate': str(occupancy),
                'checksum': checksum,
            },
        )
        return Response({
            'success': True,
            'message': f'Night Audit successfully finalized for {business_date}. System rolled to {next_date}.',
            'session': NightAuditSessionSerializer(session).data,
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path='daily-flash')
    def daily_flash(self, request):
        business_date = self._parse_date(
            request.query_params.get('date')) or timezone.localdate()
        property_config = Property.objects.order_by('created_at').first()
        total_rooms = Room.objects.filter(is_active=True).count()
        occupied_rooms = Reservation.objects.filter(
            status=ReservationStatus.CHECKED_IN,
            check_in_date__lte=business_date,
            check_out_date__gt=business_date,
        ).values('room_id').distinct().count()
        daily_items = FolioItem.objects.filter(posted_at__date=business_date)
        room_revenue = daily_items.filter(category='ROOM').aggregate(
            total=Sum('amount'))['total'] or Decimal('0.00')
        fb_revenue = daily_items.filter(category__in=['RESTAURANT', 'MINIBAR']).aggregate(
            total=Sum('amount'))['total'] or Decimal('0.00')
        spa_revenue = daily_items.filter(category='SPA').aggregate(
            total=Sum('amount'))['total'] or Decimal('0.00')
        transport_revenue = daily_items.filter(category='TRANSFER').aggregate(
            total=Sum('amount'))['total'] or Decimal('0.00')
        misc_revenue = daily_items.filter(category='MISC').aggregate(
            total=Sum('amount'))['total'] or Decimal('0.00')
        fb_revenue += RestaurantOrder.objects.filter(
            status='SETTLED', settled_at__date=business_date,
        ).aggregate(total=Sum('subtotal'))['total'] or Decimal('0.00')

        base = room_revenue + fb_revenue + spa_revenue + transport_revenue + misc_revenue
        service_rate = property_config.service_charge_rate if property_config else Decimal(
            '0.10')
        vat_rate = property_config.vat_rate if property_config else Decimal(
            '0.15')
        service_charge = (base * service_rate).quantize(CENT)
        vat = ((base + service_charge) * vat_rate).quantize(CENT)
        gross = base + service_charge + vat
        payments = Payment.objects.filter(
            status='COMPLETED', created_at__date=business_date)

        return Response({
            'property_name': property_config.name if property_config else '',
            'tin_number': property_config.tin_number if property_config else '',
            'business_date': str(business_date),
            'kpis': {
                'total_rooms': total_rooms,
                'occupied_rooms': occupied_rooms,
                'occupancy_rate': round(occupied_rooms / total_rooms * 100, 1) if total_rooms else 0,
                'adr_etb': round(float(room_revenue / occupied_rooms), 2) if occupied_rooms else 0,
                'revpar_etb': round(float(room_revenue / total_rooms), 2) if total_rooms else 0,
            },
            'revenue_breakdown': {
                'rooms_etb': float(room_revenue),
                'food_and_beverage_etb': float(fb_revenue),
                'spa_and_wellness_etb': float(spa_revenue),
                'transport_etb': float(transport_revenue),
                'miscellaneous_etb': float(misc_revenue),
                'subtotal_etb': float(base),
                'service_charge_etb': float(service_charge),
                'vat_15_percent_etb': float(vat),
                'gross_total_etb': float(gross),
            },
            'settlements': {
                'telebirr_etb': float(payments.filter(method='TELEBIRR').aggregate(total=Sum('amount'))['total'] or Decimal('0.00')),
                'cbe_birr_card_etb': float(payments.filter(method__in=['CBE_BIRR', 'CARD']).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')),
                'cash_etb': float(payments.filter(method='CASH').aggregate(total=Sum('amount'))['total'] or Decimal('0.00')),
                'bank_transfer_etb': float(payments.filter(method='BANK_TRANSFER').aggregate(total=Sum('amount'))['total'] or Decimal('0.00')),
            },
        })

    @action(detail=False, methods=['get'], url_path='tax-compliance')
    def tax_compliance(self, request):
        property_config = Property.objects.order_by('created_at').first()
        if property_config is None:
            return Response({'detail': 'Property configuration is not initialized.'}, status=status.HTTP_404_NOT_FOUND)
        return Response({
            'taxpayer_name': property_config.name,
            'tin_number': property_config.tin_number,
            'telebirr_merchant_short_code': property_config.telebirr_short_code,
            'currency': property_config.currency,
            'tax_rates': {
                'vat_rate_percent': float(property_config.vat_rate * 100),
                'service_charge_rate_percent': float(property_config.service_charge_rate * 100),
            },
            'compliance_status': 'CONFIGURED',
        })

    @staticmethod
    def _parse_date(value):
        if not value:
            return None
        try:
            return date.fromisoformat(value)
        except (TypeError, ValueError):
            return None
