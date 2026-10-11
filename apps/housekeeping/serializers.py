from rest_framework import serializers
from .models import HousekeepingTask


class HousekeepingTaskSerializer(serializers.ModelSerializer):
    room_number = serializers.CharField(
        source='room.room_number', read_only=True)
    room_type = serializers.CharField(
        source='room.room_type.name', read_only=True)
    assigned_to_name = serializers.CharField(
        source='assigned_to.get_full_name', read_only=True)
    inspected_by_name = serializers.CharField(
        source='inspected_by.get_full_name', read_only=True)

    class Meta:
        model = HousekeepingTask
        fields = [
            'id',
            'room',
            'room_number',
            'room_type',
            'task_type',
            'status',
            'priority',
            'assigned_to',
            'assigned_to_name',
            'notes',
            'started_at',
            'completed_at',
            'inspected_by',
            'inspected_by_name',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']
