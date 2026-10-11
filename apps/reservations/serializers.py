import random
import uuid
from decimal import Decimal, InvalidOperation
from datetime import timedelta, datetime
from django.utils import timezone
from rest_framework import serializers

from apps.guests.models import Guest, IDType, VIPTier
from apps.rooms.models import Room, RoomType, RatePlan, RoomStatus
from apps.reservations.models import Reservation, RoomHold, BookingSource, ReservationStatus


def is_valid_uuid(val):
    if not val:
        return False
    try:
        uuid.UUID(str(val))
        return True
    except (ValueError, TypeError, AttributeError):
        return False


def quantize_decimal(val, default='0.00'):
    if val is None or val == '':
        return Decimal(default)
    try:
        # Round to 2 decimal places to satisfy DRF decimal_places=2 constraint
        return Decimal(str(val)).quantize(Decimal('0.01'))
    except (InvalidOperation, ValueError, TypeError):
        return Decimal(default)


class ReservationSerializer(serializers.ModelSerializer):
    # Optional flat fields accepted from Front Desk web client
    guest_name = serializers.CharField(write_only=True, required=False, allow_blank=True)
    guest_email = serializers.CharField(write_only=True, required=False, allow_blank=True)
    guest_phone = serializers.CharField(write_only=True, required=False, allow_blank=True)
    id_type = serializers.CharField(write_only=True, required=False, allow_blank=True)
    id_number = serializers.CharField(write_only=True, required=False, allow_blank=True)
    room_number = serializers.CharField(write_only=True, required=False, allow_blank=True)
    rate_plan_name = serializers.CharField(write_only=True, required=False, allow_blank=True)
    payment_method = serializers.CharField(write_only=True, required=False, allow_blank=True)

    # Tolerant choices
    source = serializers.CharField(required=False, default=BookingSource.WALK_IN)
    status = serializers.CharField(required=False, default=ReservationStatus.CONFIRMED)

    # Flexible Foreign keys
    guest = serializers.PrimaryKeyRelatedField(queryset=Guest.objects.all(), required=False, allow_null=True)
    room = serializers.PrimaryKeyRelatedField(queryset=Room.objects.all(), required=False, allow_null=True)
    rate_plan = serializers.PrimaryKeyRelatedField(queryset=RatePlan.objects.all(), required=False, allow_null=True)
    confirmation_code = serializers.CharField(required=False, allow_blank=True)

    # Explicitly allow decimal fields without strict validation failure
    room_rate_total_etb = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    service_charge_etb = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    vat_etb = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    grand_total_etb = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    deposit_paid_etb = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    adults = serializers.IntegerField(required=False, default=1)
    children = serializers.IntegerField(required=False, default=0)

    # Read-only enrichments for UI
    guest_name_display = serializers.CharField(source='guest.full_name', read_only=True)
    guest_phone_display = serializers.CharField(source='guest.phone_number', read_only=True)
    guest_email_display = serializers.CharField(source='guest.email', read_only=True)
    room_number_display = serializers.CharField(source='room.room_number', read_only=True)
    room_type_display = serializers.CharField(source='room.room_type.name', read_only=True)
    rate_plan_display = serializers.CharField(source='rate_plan.name', read_only=True)

    class Meta:
        model = Reservation
        fields = '__all__'
        extra_kwargs = {
            'confirmation_code': {'validators': []},  # Disable auto-unique validator to allow upsert/re-sync
        }

    def to_internal_value(self, data):
        # Create a mutable copy of incoming payload
        data = data.copy() if hasattr(data, 'copy') else dict(data)

        # 1. Clean primary key 'id' if not a valid UUID
        if 'id' in data and not is_valid_uuid(data['id']):
            data.pop('id')

        # 2. Sanitize Foreign Key fields: guest, room, rate_plan
        # If client passed client IDs (e.g. 'room-101', 'guest-1'), convert to helper fields
        if 'room' in data and not is_valid_uuid(data['room']):
            raw_room = str(data.pop('room', '')).replace('room-', '').strip()
            if raw_room and 'room_number' not in data:
                data['room_number'] = raw_room
        if 'room_id' in data and 'room_number' not in data:
            data['room_number'] = str(data.pop('room_id')).replace('room-', '').strip()

        if 'guest' in data and not is_valid_uuid(data['guest']):
            raw_guest = str(data.pop('guest', '')).strip()
            if raw_guest and not raw_guest.startswith('guest-') and 'guest_name' not in data:
                data['guest_name'] = raw_guest

        if 'rate_plan' in data and not is_valid_uuid(data['rate_plan']):
            raw_rp = str(data.pop('rate_plan', '')).strip()
            if raw_rp and 'rate_plan_name' not in data:
                data['rate_plan_name'] = raw_rp

        # 3. Sanitize check_in_date & check_out_date (convert ISO timestamp to YYYY-MM-DD)
        today_str = timezone.now().strftime('%Y-%m-%d')
        tomorrow_str = (timezone.now() + timedelta(days=1)).strftime('%Y-%m-%d')

        if 'check_in_date' in data and data['check_in_date']:
            data['check_in_date'] = str(data['check_in_date']).split('T')[0].split(' ')[0]
        else:
            data['check_in_date'] = today_str

        if 'check_out_date' in data and data['check_out_date']:
            data['check_out_date'] = str(data['check_out_date']).split('T')[0].split(' ')[0]
        else:
            data['check_out_date'] = tomorrow_str

        # 4. Quantize decimal fields to 2 decimal places to avoid DRF DecimalField precision errors
        for dec_field in ['room_rate_total_etb', 'service_charge_etb', 'vat_etb', 'grand_total_etb', 'deposit_paid_etb']:
            if dec_field in data and data[dec_field] is not None:
                data[dec_field] = quantize_decimal(data[dec_field])

        # Auto-compute financial totals if partially provided
        base_rate = quantize_decimal(data.get('room_rate_total_etb', '3500.00'))
        if 'room_rate_total_etb' not in data:
            data['room_rate_total_etb'] = base_rate
        if 'service_charge_etb' not in data:
            data['service_charge_etb'] = quantize_decimal(base_rate * Decimal('0.10'))
        if 'vat_etb' not in data:
            data['vat_etb'] = quantize_decimal(base_rate * Decimal('0.15'))
        if 'grand_total_etb' not in data:
            data['grand_total_etb'] = quantize_decimal(
                data['room_rate_total_etb'] + data['service_charge_etb'] + data['vat_etb']
            )
        if 'deposit_paid_etb' not in data:
            data['deposit_paid_etb'] = data['grand_total_etb']

        return super().to_internal_value(data)

    def validate_source(self, value):
        if not value:
            return BookingSource.WALK_IN
        v = str(value).upper().replace('-', '_').replace(' ', '_')
        valid = [c[0] for c in BookingSource.choices]
        return v if v in valid else BookingSource.WALK_IN

    def validate_status(self, value):
        if not value:
            return ReservationStatus.CONFIRMED
        v = str(value).upper().replace('-', '_').replace(' ', '_')
        valid = [c[0] for c in ReservationStatus.choices]
        return v if v in valid else ReservationStatus.CONFIRMED

    def create(self, validated_data):
        # Extract frontend helper fields
        guest_name = validated_data.pop('guest_name', None) or 'Walk-in Guest'
        guest_email = validated_data.pop('guest_email', None) or ''
        guest_phone = validated_data.pop('guest_phone', None) or ''
        id_type_raw = (validated_data.pop('id_type', None) or 'FAYDA').upper()
        id_number_val = validated_data.pop('id_number', None) or f"FAN-9901-{random.randint(1000, 9999)}"
        room_number_val = validated_data.pop('room_number', None) or '101'
        rate_plan_name_val = validated_data.pop('rate_plan_name', None) or 'Standard Flexible Rate'
        validated_data.pop('payment_method', None)

        # 1. Resolve or Create Guest
        guest = validated_data.get('guest')
        if not guest:
            if guest_phone:
                guest = Guest.objects.filter(phone_number=guest_phone).first()
            if not guest and guest_email:
                guest = Guest.objects.filter(email=guest_email).first()
            if not guest and guest_name:
                guest = Guest.objects.filter(full_name__iexact=guest_name).first()
            if not guest:
                id_type_choice = IDType.FAYDA
                for choice in IDType.values:
                    if choice.upper() == id_type_raw:
                        id_type_choice = choice
                        break

                guest = Guest.objects.create(
                    full_name=guest_name,
                    email=guest_email if guest_email else None,
                    phone_number=guest_phone if guest_phone else f"+25191{random.randint(1000000, 9999999)}",
                    id_type=id_type_choice,
                    id_number=id_number_val,
                    nationality='Ethiopian',
                    vip_tier=VIPTier.REGULAR,
                )
            validated_data['guest'] = guest

        # 2. Resolve Room (with auto-provision if room number doesn't exist yet)
        room = validated_data.get('room')
        if not room:
            clean_num = str(room_number_val).replace('room-', '').strip() or '101'
            room = Room.objects.filter(room_number=clean_num).first()
            if not room:
                room = Room.objects.filter(room_number__icontains=clean_num).first()
            if not room:
                # Automatically provision physical room in database
                r_type = RoomType.objects.first()
                if not r_type:
                    r_type = RoomType.objects.create(
                        name='Standard King',
                        name_amharic='ስታንዳርድ ኪንግ',
                        base_price_etb=Decimal('3500.00'),
                        description='Standard Room at Arbaminch Tourist Hotel',
                    )
                floor_num = 1
                try:
                    floor_num = int(clean_num[0])
                except (ValueError, IndexError):
                    floor_num = 1
                room = Room.objects.create(
                    room_number=clean_num,
                    room_type=r_type,
                    floor=floor_num,
                    status=RoomStatus.OCCUPIED if validated_data.get('status') == 'CHECKED_IN' else RoomStatus.VACANT_CLEAN,
                )
            validated_data['room'] = room

        # 3. Resolve Rate Plan
        rate_plan = validated_data.get('rate_plan')
        if not rate_plan:
            if rate_plan_name_val:
                rate_plan = RatePlan.objects.filter(name__icontains=rate_plan_name_val).first()
            if not rate_plan:
                rate_plan = RatePlan.objects.first()
            if not rate_plan:
                rate_plan = RatePlan.objects.create(
                    name='Standard Flexible Rate',
                    multiplier=Decimal('1.00'),
                    description='Standard Room Rate',
                )
            validated_data['rate_plan'] = rate_plan

        # 4. Confirmation Code Handling (Upsert if exists)
        code = validated_data.get('confirmation_code')
        if code:
            existing_res = Reservation.objects.filter(confirmation_code=code).first()
            if existing_res:
                for attr, val in validated_data.items():
                    setattr(existing_res, attr, val)
                existing_res.save()
                return existing_res
        else:
            code = f"GH-2026-{random.randint(1000, 9999)}"
            while Reservation.objects.filter(confirmation_code=code).exists():
                code = f"GH-2026-{random.randint(1000, 9999)}"
            validated_data['confirmation_code'] = code

        # 5. Financial Defaults
        if 'room_rate_total_etb' not in validated_data:
            validated_data['room_rate_total_etb'] = Decimal('3500.00')
        if 'service_charge_etb' not in validated_data:
            validated_data['service_charge_etb'] = quantize_decimal(Decimal(str(validated_data['room_rate_total_etb'])) * Decimal('0.10'))
        if 'vat_etb' not in validated_data:
            validated_data['vat_etb'] = quantize_decimal(Decimal(str(validated_data['room_rate_total_etb'])) * Decimal('0.15'))
        if 'grand_total_etb' not in validated_data:
            validated_data['grand_total_etb'] = quantize_decimal(
                Decimal(str(validated_data['room_rate_total_etb'])) +
                Decimal(str(validated_data['service_charge_etb'])) +
                Decimal(str(validated_data['vat_etb']))
            )
        if 'deposit_paid_etb' not in validated_data:
            validated_data['deposit_paid_etb'] = validated_data['grand_total_etb']

        return super().create(validated_data)


class RoomHoldSerializer(serializers.ModelSerializer):
    class Meta:
        model = RoomHold
        fields = '__all__'
