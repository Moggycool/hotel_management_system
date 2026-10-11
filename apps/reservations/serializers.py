from rest_framework import serializers

from apps.reservations.models import Reservation, RoomHold


class ReservationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Reservation
        fields = '__all__'


class RoomHoldSerializer(serializers.ModelSerializer):
    class Meta:
        model = RoomHold
        fields = '__all__'
