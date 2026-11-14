from rest_framework import serializers

from apps.rooms.models import RatePlan, RatePlanProposal, Room, RoomType


class RoomTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = RoomType
        fields = '__all__'


class RatePlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = RatePlan
        fields = '__all__'


class RatePlanProposalSerializer(serializers.ModelSerializer):
    proposed_by_name = serializers.CharField(
        source='proposed_by.full_name', read_only=True)
    approved_by_name = serializers.CharField(
        source='approved_by.full_name', read_only=True)

    class Meta:
        model = RatePlanProposal
        fields = '__all__'
        read_only_fields = [
            'id', 'status', 'proposed_by', 'approved_by', 'decision_notes',
            'created_at', 'decided_at',
        ]

    def validate_multiplier(self, value):
        if value <= 0:
            raise serializers.ValidationError(
                'Rate multiplier must be greater than zero.')
        return value

    def validate_fixed_surcharge_etb(self, value):
        if value < 0:
            raise serializers.ValidationError(
                'Fixed surcharge cannot be negative.')
        return value


class RoomSerializer(serializers.ModelSerializer):
    room_type = RoomTypeSerializer(read_only=True)
    room_type_id = serializers.PrimaryKeyRelatedField(
        source='room_type',
        queryset=RoomType.objects.all(),
        write_only=True,
    )

    class Meta:
        model = Room
        fields = '__all__'

    def validate(self, attrs):
        if self.instance:
            protected_fields = ('status', 'housekeeping_status')
            changed = [
                field for field in protected_fields
                if field in attrs and attrs[field] != getattr(self.instance, field)
            ]
            if changed:
                raise serializers.ValidationError({
                    field: 'Use the controlled room workflow to change room status.'
                    for field in changed
                })
        return attrs


class PublicRoomTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = RoomType
        fields = [
            'name', 'description', 'base_price_etb', 'max_adults',
            'max_children', 'bed_type', 'size_sqm', 'amenities',
            'photo',
        ]


class PublicAvailableRoomSerializer(serializers.ModelSerializer):
    room_type = PublicRoomTypeSerializer(read_only=True)

    class Meta:
        model = Room
        fields = ['id', 'room_type']
