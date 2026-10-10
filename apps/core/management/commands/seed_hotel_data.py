from decimal import Decimal
from datetime import date, timedelta
from django.core.management.base import BaseCommand
from apps.accounts.models import User, StaffRole
from apps.properties.models import Property
from apps.rooms.models import RoomType, Room, RatePlan, RoomStatus
from apps.guests.models import Guest, IDType, VIPTier
from apps.reservations.models import Reservation, BookingSource, ReservationStatus


class Command(BaseCommand):
    help = 'Seeds Arbaminch Tourist Hotel property, staff roles, rooms, and guests'

    def handle(self, *args, **options):
        self.stdout.write("Seeding Arbaminch Tourist Hotel Data...")

        # 1. Property
        prop, _ = Property.objects.get_or_create(
            name='Arbaminch Tourist Hotel',
            defaults={
                'name_amharic': 'አርባ ምንጭ ቱሪስት ሆቴል',
                'tin_number': '0062819401',
                'vat_rate': Decimal('0.1500'),
                'service_charge_rate': Decimal('0.1000'),
                'telebirr_short_code': '194022',
            }
        )

        # 2. Staff Users for Each Role
        staff_data = [
            ('gm@arbaminchhotel.et', 'Yonas Haile',
             StaffRole.GENERAL_MANAGER, True),
            ('fom@arbaminchhotel.et', 'Dawit Bekele',
             StaffRole.FRONT_OFFICE_MANAGER, True),
            ('reception@arbaminchhotel.et',
             'Tigist Alemu', StaffRole.RECEPTIONIST, True),
            ('cashier@arbaminchhotel.et', 'Kenenisa Desta', StaffRole.CASHIER, True),
            ('housekeeping@arbaminchhotel.et', 'Almaz Tadesse',
             StaffRole.HOUSEKEEPING_SUPERVISOR, True),
            ('finance@arbaminchhotel.et', 'Mulugeta Tesfaye',
             StaffRole.FINANCE_OFFICER, True),
        ]

        for email, name, role, is_staff in staff_data:
            if not User.objects.filter(email=email).exists():
                u = User.objects.create_user(
                    email=email,
                    password='ArbaHotel#2026',
                    full_name=name,
                    role=role,
                    is_staff=is_staff,
                )
                self.stdout.write(
                    f"Created staff user: {u.full_name} ({role})")

        # 3. Room Types
        types_data = [
            ('Standard King', 'ስታንዳርድ ኪንግ', Decimal('3500.00'), 2, '1 King Bed'),
            ('Deluxe Lake Chamo View', 'ዴሉክስ ጫሞ እይታ',
             Decimal('5200.00'), 2, '1 King Bed + Balcony'),
            ('Nechisar Executive Suite', 'ነጭ ሳር ኤክስኪዩቲቭ ስዊት',
             Decimal('7800.00'), 3, '1 King Master + Lounge'),
            ('Garden Family Villa', 'የቤተሰብ ቪላ', Decimal(
                '11500.00'), 5, '2 King Beds + Kitchenette'),
        ]
        room_types = {}
        for name, amharic, price, adults, bed in types_data:
            rt, _ = RoomType.objects.get_or_create(
                name=name,
                defaults={
                    'name_amharic': amharic,
                    'base_price_etb': price,
                    'max_adults': adults,
                    'bed_type': bed,
                    'description': f'Comfortable luxury room at Arbaminch Tourist Hotel with views of Nechisar.',
                    'amenities': ['High-Speed Wi-Fi', 'Smart TV', 'Hot Spring Water Shower', 'Coffee Station'],
                }
            )
            room_types[name] = rt

        # 4. Rate Plans
        rp_standard, _ = RatePlan.objects.get_or_create(
            name='Standard Flexible Rate',
            defaults={'multiplier': Decimal(
                '1.00'), 'description': 'Full flexible booking rate'}
        )
        rp_resident, _ = RatePlan.objects.get_or_create(
            name='Ethiopian Resident Special (15% Off)',
            defaults={'multiplier': Decimal(
                '0.85'), 'is_resident_only': True, 'description': 'For Ethiopian citizens/residents'}
        )

        # 5. Physical Rooms
        room_map = [
            ('101', 1, 'Standard King', RoomStatus.VACANT_CLEAN),
            ('102', 1, 'Standard King', RoomStatus.VACANT_CLEAN),
            ('201', 2, 'Deluxe Lake Chamo View', RoomStatus.VACANT_CLEAN),
            ('202', 2, 'Deluxe Lake Chamo View', RoomStatus.VACANT_CLEAN),
            ('301', 3, 'Nechisar Executive Suite', RoomStatus.VACANT_CLEAN),
            ('401', 4, 'Garden Family Villa', RoomStatus.VACANT_CLEAN),
        ]
        rooms_dict = {}
        for r_num, floor, r_type_name, st in room_map:
            r, _ = Room.objects.get_or_create(
                room_number=r_num,
                defaults={
                    'room_type': room_types[r_type_name],
                    'floor': floor,
                    'status': st,
                }
            )
            rooms_dict[r_num] = r

        # 6. Sample Guest
        guest, _ = Guest.objects.get_or_create(
            phone_number='+251911223344',
            defaults={
                'full_name': 'Ato Bekele Tadesse',
                'email': 'bekele.tadesse@telecom.et',
                'id_type': IDType.FAYDA,
                'id_number': 'FAN-9901-4428',
                'vip_tier': VIPTier.GOLD,
                'preferences': 'Prefers lake view; black coffee in morning.',
            }
        )

        # 7. Sample Confirmed Reservation
        today = date.today()
        base = room_types['Deluxe Lake Chamo View'].base_price_etb * 2
        svc = (base * Decimal('0.10')).quantize(Decimal('0.01'))
        vat = (base * Decimal('0.15')).quantize(Decimal('0.01'))
        grand = base + svc + vat

        Reservation.objects.get_or_create(
            confirmation_code='ARB-2026-1001',
            defaults={
                'guest': guest,
                'room': rooms_dict['201'],
                'rate_plan': rp_standard,
                'check_in_date': today,
                'check_out_date': today + timedelta(days=2),
                'adults': 2,
                'source': BookingSource.WALK_IN,
                'status': ReservationStatus.CONFIRMED,
                'room_rate_total_etb': base,
                'service_charge_etb': svc,
                'vat_etb': vat,
                'grand_total_etb': grand,
                'deposit_paid_etb': grand,
            }
        )

        self.stdout.write(self.style.SUCCESS(
            "Database seeded successfully with Arbaminch hotel inventory!"))
