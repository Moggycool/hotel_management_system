""" Seeds the database with initial data for Arbaminch Tourist Hotel, including property details, staff roles, room types, physical rooms, guests and reservations. """
from decimal import Decimal
from datetime import date, timedelta
from django.core.management.base import BaseCommand
from apps.accounts.models import User, StaffRole
from apps.properties.models import Property
from apps.rooms.models import RoomType, Room, RatePlan, RoomStatus
from apps.guests.models import Guest, IDType, VIPTier
from apps.reservations.models import Reservation, BookingSource, ReservationStatus


class Command(BaseCommand):
    help = 'Seeds Arbaminch Tourist Hotel property, staff roles, rooms, guests, and reservations'

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
            user = User.objects.filter(email=email).first()
            is_super = (role == StaffRole.GENERAL_MANAGER)
            if not user:
                u = User.objects.create_user(
                    email=email,
                    password='ArbaHotel#2026',
                    full_name=name,
                    role=role,
                    is_staff=is_staff,
                    is_superuser=is_super,
                )
                self.stdout.write(
                    f"Created staff user: {u.full_name} ({role}) [Superuser: {is_super}]")
            else:
                user.is_staff = is_staff
                if is_super:
                    user.is_superuser = True
                user.save()

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

        # 5. Physical Rooms (Complete Inventory)
        room_map = [
            ('101', 1, 'Standard King', RoomStatus.OCCUPIED),
            ('102', 1, 'Standard King', RoomStatus.OCCUPIED),
            ('103', 1, 'Standard King', RoomStatus.VACANT_CLEAN),
            ('104', 1, 'Standard King', RoomStatus.VACANT_CLEAN),
            ('201', 2, 'Deluxe Lake Chamo View', RoomStatus.OCCUPIED),
            ('202', 2, 'Deluxe Lake Chamo View', RoomStatus.OCCUPIED),
            ('203', 2, 'Deluxe Lake Chamo View', RoomStatus.VACANT_CLEAN),
            ('204', 2, 'Deluxe Lake Chamo View', RoomStatus.VACANT_CLEAN),
            ('301', 3, 'Nechisar Executive Suite', RoomStatus.VACANT_CLEAN),
            ('302', 3, 'Nechisar Executive Suite', RoomStatus.OCCUPIED),
            ('303', 3, 'Nechisar Executive Suite', RoomStatus.OCCUPIED),
            ('305', 3, 'Nechisar Executive Suite', RoomStatus.OCCUPIED),
            ('401', 4, 'Garden Family Villa', RoomStatus.VACANT_CLEAN),
            ('402', 4, 'Garden Family Villa', RoomStatus.OCCUPIED),
            ('403', 4, 'Garden Family Villa', RoomStatus.OCCUPIED),
            ('404', 4, 'Garden Family Villa', RoomStatus.VACANT_CLEAN),
            ('405', 4, 'Standard King', RoomStatus.OCCUPIED),
            ('205', 2, 'Deluxe Lake Chamo View', RoomStatus.VACANT_CLEAN),
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

        # 6. Sample Guests
        guests_data = [
            ('Ato Bekele Tadesse', '+251911223344', 'bekele.tadesse@telecom.et',
             IDType.FAYDA, 'FAN-9901-4428', VIPTier.GOLD),
            ('Tigist Mengistu', '+251912334455', 'tigist.m@cbe.com.et',
             IDType.KEBELE, 'KB-04-88219', VIPTier.PLATINUM),
            ('Dr. Hailu Zewde', '+251913445566', 'hailu.zewde@aau.edu.et',
             IDType.FAYDA, 'FAN-4412-9901', VIPTier.SILVER),
            ('Sara Kassa', '+251914556677', 'sara.kassa@flyethiopian.com',
             IDType.PASSPORT, 'EP-882194', VIPTier.REGULAR),
            ('Kenenisa Tulu', '+251915667788', 'kenenisa.tulu@moa.gov.et',
             IDType.FAYDA, 'FAN-7711-2299', VIPTier.GOLD),
            ('Moggy Ged', '+251911009988', 'dfdf@gmail.com',
             IDType.FAYDA, 'FAN-2233-4455', VIPTier.REGULAR),
            ('Alexander Wright', '+251911100001', 'a.wright@metals.com',
             IDType.PASSPORT, 'PASSPORT-UK-849201', VIPTier.PLATINUM),
            ('Elena Rostova', '+251911100002', 'elena.rostova@geothermal.org',
             IDType.PASSPORT, 'PASSPORT-CH-992104', VIPTier.GOLD),
            ('Marcus Vance', '+251911100003', 'marcus.vance@safari.com',
             IDType.PASSPORT, 'PASSPORT-US-551029', VIPTier.SILVER),
            ('Sophia Montgomery', '+251911100004', 'sophia.montgomery@example.com',
             IDType.PASSPORT, 'PASSPORT-FR-302194', VIPTier.REGULAR),
            ('David & Emily Miller', '+251911100005', 'miller.family@gmail.com',
             IDType.PASSPORT, 'PASSPORT-CA-220194', VIPTier.REGULAR),
            ('Amara Okafor', '+251911100006', 'amara.okafor@afdb.org',
             IDType.PASSPORT, 'PASSPORT-NG-901248', VIPTier.GOLD),
            ('Lucas & Chloe Bennett', '+251911100007', 'lucas.bennett@media.co.uk',
             IDType.PASSPORT, 'PASSPORT-GB-112039', VIPTier.REGULAR),
            ('Claire Beauchamp', '+251911100008', 'claire.beauchamp@nature.fr',
             IDType.PASSPORT, 'PASSPORT-FR-883019', VIPTier.SILVER),
            ('Nikhil Sharma', '+251911100009', 'nikhil.sharma@techconsult.in',
             IDType.PASSPORT, 'PASSPORT-IN-440192', VIPTier.GOLD),
            ('Victoria Sterling', '+251911100010', 'v.sterling@heritage.org',
             IDType.PASSPORT, 'PASSPORT-GB-771920', VIPTier.PLATINUM),
        ]

        created_guests = []
        for name, phone, email, id_type, id_num, vip in guests_data:
            g, _ = Guest.objects.get_or_create(
                phone_number=phone,
                defaults={
                    'full_name': name,
                    'email': email,
                    'id_type': id_type,
                    'id_number': id_num,
                    'vip_tier': vip,
                    'preferences': 'Standard guest profile',
                }
            )
            created_guests.append(g)

        # 7. Seed Sample Confirmed & In-House Reservations
        today = date.today()
        sample_reservations = [
            ('ARB-2026-1001', created_guests[0], rooms_dict['201'], today, today + timedelta(
                days=2), Decimal('10400.00'), BookingSource.WALK_IN, ReservationStatus.CONFIRMED),
            ('GH-2026-9084', created_guests[1], rooms_dict['101'], today, today + timedelta(
                days=2), Decimal('7000.00'), BookingSource.WEBSITE, ReservationStatus.CHECKED_IN),
            ('GH-2026-1520', created_guests[2], rooms_dict['102'], today, today + timedelta(
                days=1), Decimal('3500.00'), BookingSource.PHONE, ReservationStatus.CHECKED_IN),
            ('GH-2026-2304', created_guests[3], rooms_dict['305'], today - timedelta(days=1), today + timedelta(
                days=2), Decimal('15600.00'), BookingSource.CORPORATE, ReservationStatus.CHECKED_IN),
            ('GH-2026-2970', created_guests[4], rooms_dict['403'], today, today + timedelta(
                days=3), Decimal('34500.00'), BookingSource.AGENT, ReservationStatus.CHECKED_IN),
            ('GH-2026-2356', created_guests[5], rooms_dict['402'], today, today + timedelta(
                days=2), Decimal('23000.00'), BookingSource.WALK_IN, ReservationStatus.CHECKED_IN),
            ('GH-2026-1011', created_guests[6], rooms_dict['101'], today - timedelta(days=2), today + timedelta(
                days=3), Decimal('17500.00'), BookingSource.WEBSITE, ReservationStatus.CHECKED_IN),
            ('GH-2026-1044', created_guests[7], rooms_dict['104'], today - timedelta(days=1), today + timedelta(
                days=4), Decimal('14000.00'), BookingSource.CORPORATE, ReservationStatus.CHECKED_IN),
            ('GH-2026-2015', created_guests[8], rooms_dict['201'], today - timedelta(days=3), today + timedelta(
                days=2), Decimal('26000.00'), BookingSource.AGENT, ReservationStatus.CHECKED_IN),
            ('GH-2026-3019', created_guests[9], rooms_dict['301'], today - timedelta(days=1), today + timedelta(
                days=3), Decimal('31200.00'), BookingSource.WEBSITE, ReservationStatus.CHECKED_IN),
            ('GH-2026-3033', created_guests[10], rooms_dict['303'], today - timedelta(days=2), today + timedelta(
                days=2), Decimal('20800.00'), BookingSource.PHONE, ReservationStatus.CHECKED_IN),
            ('GH-2026-4010', created_guests[11], rooms_dict['401'], today - timedelta(days=1), today + timedelta(
                days=5), Decimal('69000.00'), BookingSource.CORPORATE, ReservationStatus.CHECKED_IN),
            ('GH-2026-1039', created_guests[12], rooms_dict['103'], today + timedelta(days=1), today + timedelta(
                days=4), Decimal('10500.00'), BookingSource.WEBSITE, ReservationStatus.CONFIRMED),
            ('GH-2026-2054', created_guests[13], rooms_dict['205'], today + timedelta(days=2), today + timedelta(
                days=5), Decimal('15600.00'), BookingSource.AGENT, ReservationStatus.CONFIRMED),
            ('GH-2026-4047', created_guests[14], rooms_dict['404'], today + timedelta(days=3), today + timedelta(
                days=7), Decimal('46000.00'), BookingSource.CORPORATE, ReservationStatus.CONFIRMED),
            ('GH-2026-2032', created_guests[15], rooms_dict['203'], today + timedelta(days=4), today + timedelta(
                days=6), Decimal('10400.00'), BookingSource.PHONE, ReservationStatus.CONFIRMED),
        ]

        for code, guest, room, check_in, check_out, rate_total, source, status in sample_reservations:
            svc = (rate_total * Decimal('0.10')).quantize(Decimal('0.01'))
            vat = (rate_total * Decimal('0.15')).quantize(Decimal('0.01'))
            grand = rate_total + svc + vat

            Reservation.objects.get_or_create(
                confirmation_code=code,
                defaults={
                    'guest': guest,
                    'room': room,
                    'rate_plan': rp_standard,
                    'check_in_date': check_in,
                    'check_out_date': check_out,
                    'adults': 2,
                    'source': source,
                    'status': status,
                    'room_rate_total_etb': rate_total,
                    'service_charge_etb': svc,
                    'vat_etb': vat,
                    'grand_total_etb': grand,
                    'deposit_paid_etb': grand,
                }
            )

        self.stdout.write(self.style.SUCCESS(
            "Database seeded successfully with Arbaminch hotel inventory and reservations!"))
