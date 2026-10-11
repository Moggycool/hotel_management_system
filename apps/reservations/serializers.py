import random
from decimal import Decimal
from django.utils import timezone
from rest_framework import serializers

from apps.guests.models import Guest, IDType, VIPTier
from apps.rooms.models import Room, RoomType, RatePlan, RoomStatus
from apps.reservations.models import Reservation, RoomHold, BookingSource, ReservationStatus


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

    # Tolerant choices (accepts 'walk_in', 'WALK_IN', 'confirmed', 'CONFIRMED', etc.)
    source = serializers.CharField(required=False, default=BookingSource.WALK_IN)
    status = serializers.CharField(required=False, default=ReservationStatus.CONFIRMED)

    # Foreign keys made optional for input when flat fields are provided
    guest = serializers.PrimaryKeyRelatedField(queryset=Guest.objects.all(), required=False)
    room = serializers.PrimaryKeyRelatedField(queryset=Room.objects.all(), required=False)
    rate_plan = serializers.PrimaryKeyRelatedField(queryset=RatePlan.objects.all(), required=False)
    confirmation_code = serializers.CharField(required=False, allow_blank=True)

    # Read-only enrichments
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
        id_number_val = validated_data.pop('id_number', None) or f"ID-{int(timezone.now().timestamp())}"
        room_number_val = validated_data.pop('room_number', None) or ''
        rate_plan_name_val = validated_data.pop('rate_plan_name', None) or ''
        validated_data.pop('payment_method', None)

        # 1. Resolve or Create Guest
        guest = validated_data.get('guest')
        if not guest:
            if guest_phone:
                guest = Guest.objects.filter(phone_number=guest_phone).first()
            if not guest and guest_email:
                guest = Guest.objects.filter(email=guest_email).first()
            if not guest and guest_name:
                guest = Guest.objects.filter(full_name=guest_name).first()
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
            if room_number_val:
                clean_num = str(room_number_val).replace('room-', '').strip()
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
                        pass
                    room = Room.objects.create(
                        room_number=clean_num,
                        room_type=r_type,
                        floor=floor_num,
                        status=RoomStatus.OCCUPIED if validated_data.get('status') == 'CHECKED_IN' else RoomStatus.VACANT_CLEAN,
                    )
            if not room:
                room = Room.objects.first()
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
            code = f"ARB-2026-{random.randint(1000, 9999)}"
            while Reservation.objects.filter(confirmation_code=code).exists():
                code = f"ARB-2026-{random.randint(1000, 9999)}"
            validated_data['confirmation_code'] = code

        # 5. Financial Defaults
        if 'room_rate_total_etb' not in validated_data:
            validated_data['room_rate_total_etb'] = Decimal('3500.00')
        if 'service_charge_etb' not in validated_data:
            validated_data['service_charge_etb'] = (Decimal(str(validated_data['room_rate_total_etb'])) * Decimal('0.10')).quantize(Decimal('0.01'))
        if 'vat_etb' not in validated_data:
            validated_data['vat_etb'] = (Decimal(str(validated_data['room_rate_total_etb'])) * Decimal('0.15')).quantize(Decimal('0.01'))
        if 'grand_total_etb' not in validated_data:
            validated_data['grand_total_etb'] = (
                Decimal(str(validated_data['room_rate_total_etb'])) +
                Decimal(str(validated_data['service_charge_etb'])) +
                Decimal(str(validated_data['vat_etb']))
            ).quantize(Decimal('0.01'))
        if 'deposit_paid_etb' not in validated_data:
            validated_data['deposit_paid_etb'] = validated_data['grand_total_etb']

        return super().create(validated_data)


class RoomHoldSerializer(serializers.ModelSerializer):
    class Meta:
        model = RoomHold
        fields = '__all__'
