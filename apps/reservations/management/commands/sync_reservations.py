import json
import os
from decimal import Decimal
from datetime import date, timedelta
from django.core.management.base import BaseCommand
from apps.guests.models import Guest, IDType, VIPTier
from apps.rooms.models import Room, RoomType, RatePlan, RoomStatus
from apps.reservations.models import Reservation, BookingSource, ReservationStatus


class Command(BaseCommand):
    help = 'Synchronize Front Desk web reservations into the Django SQLite/PostgreSQL database'

    def add_arguments(self, parser):
        parser.add_argument(
            '--file',
            type=str,
            help='Path to exported reservations JSON file from the web UI',
            default='sync_reservations.json'
        )

    def handle(self, *args, **options):
        file_path = options.get('file')
        loaded_data = None

        if os.path.exists(file_path):
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    loaded_data = json.load(f)
                self.stdout.write(self.style.SUCCESS(f"Loaded reservation data from {file_path}"))
            except Exception as e:
                self.stdout.write(self.style.WARNING(f"Could not read {file_path}: {e}"))

        # Default rate plan
        rp, _ = RatePlan.objects.get_or_create(
            name='Standard Flexible Rate',
            defaults={'multiplier': Decimal('1.00'), 'description': 'Standard Flexible Rate'}
        )

        today = date.today()
        synced_count = 0

        if loaded_data and isinstance(loaded_data, list):
            items = loaded_data
        elif loaded_data and isinstance(loaded_data, dict) and 'reservations' in loaded_data:
            items = loaded_data['reservations']
        else:
            items = []

        for item in items:
            code = item.get('confirmation_code') or item.get('confirmationCode')
            if not code:
                continue

            guest_name = item.get('guest_name') or item.get('guestName') or 'Walk-in Guest'
            guest_phone = item.get('guest_phone') or item.get('guestPhone') or '+251 91 123 4567'
            guest_email = item.get('guest_email') or item.get('guestEmail') or ''
            room_num = str(item.get('room_number') or item.get('roomNumber') or '101').replace('room-', '').strip()

            # Find or create guest
            guest = Guest.objects.filter(phone_number=guest_phone).first()
            if not guest and guest_email:
                guest = Guest.objects.filter(email=guest_email).first()
            if not guest:
                guest = Guest.objects.filter(full_name=guest_name).first()
            if not guest:
                guest = Guest.objects.create(
                    full_name=guest_name,
                    phone_number=guest_phone,
                    email=guest_email if guest_email else None,
                    id_type=IDType.FAYDA,
                    id_number=item.get('id_number') or item.get('idNumber') or 'FAN-9901-4428',
                    nationality='Ethiopian',
                    vip_tier=VIPTier.REGULAR,
                )

            # Find or create room
            room = Room.objects.filter(room_number=room_num).first()
            if not room:
                rtype, _ = RoomType.objects.get_or_create(
                    name='Standard King',
                    defaults={'name_amharic': 'ስታንዳርድ ኪንግ', 'base_price_etb': Decimal('3500.00')}
                )
                room = Room.objects.create(
                    room_number=room_num,
                    room_type=rtype,
                    floor=1,
                    status=RoomStatus.VACANT_CLEAN
                )

            # Dates
            check_in_raw = item.get('check_in_date') or item.get('checkInDate') or str(today)
            check_out_raw = item.get('check_out_date') or item.get('checkOutDate') or str(today + timedelta(days=2))
            check_in = str(check_in_raw).split('T')[0]
            check_out = str(check_out_raw).split('T')[0]

            rate_total = Decimal(str(item.get('room_rate_total_etb') or item.get('roomRateTotal') or '3500.00'))
            vat = Decimal(str(item.get('vat_etb') or (rate_total * Decimal('0.15')).quantize(Decimal('0.01'))))
            svc = Decimal(str(item.get('service_charge_etb') or (rate_total * Decimal('0.10')).quantize(Decimal('0.01'))))
            grand = Decimal(str(item.get('grand_total_etb') or item.get('grandTotal') or (rate_total + vat + svc)))
            deposit = Decimal(str(item.get('deposit_paid_etb') or item.get('amountPaid') or grand))

            res, created = Reservation.objects.update_or_create(
                confirmation_code=code,
                defaults={
                    'guest': guest,
                    'room': room,
                    'rate_plan': rp,
                    'check_in_date': check_in,
                    'check_out_date': check_out,
                    'adults': int(item.get('adults') or 1),
                    'children': int(item.get('children') or 0),
                    'source': BookingSource.WALK_IN,
                    'status': ReservationStatus.CONFIRMED,
                    'room_rate_total_etb': rate_total,
                    'vat_etb': vat,
                    'service_charge_etb': svc,
                    'grand_total_etb': grand,
                    'deposit_paid_etb': deposit,
                    'special_requests': item.get('special_requests') or item.get('specialRequests') or '',
                }
            )
            synced_count += 1

        total_in_db = Reservation.objects.count()
        self.stdout.write(self.style.SUCCESS(
            f"Successfully processed {synced_count} reservations. Total in Django DB: {total_in_db} records."
        ))
