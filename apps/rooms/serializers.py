from rest_framework import serializers

from apps.rooms.models import RatePlan, Room, RoomType


class RoomTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = RoomType
        fields = '__all__'


class RatePlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = RatePlan
        fields = '__all__'


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


class PublicRoomTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = RoomType
        fields = [
            'name', 'description', 'base_price_etb', 'max_adults',
            'max_children', 'bed_type', 'size_sqm', 'amenities',
        ]


class PublicAvailableRoomSerializer(serializers.ModelSerializer):
    room_type = PublicRoomTypeSerializer(read_only=True)

    class Meta:
        model = Room
        fields = ['id', 'room_type']
