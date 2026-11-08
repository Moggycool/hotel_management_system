from rest_framework import serializers
from apps.accounts.models import StaffRole, User
from .models import HousekeepingTask, MaintenanceTicket


def validate_task_assignee(assignee, request, expected_role, instance=None):
    if assignee is None:
        return assignee
    manager = request.user
    if assignee.reports_to_id != manager.id:
        raise serializers.ValidationError(
            'You can only assign tasks to your direct reports.')
    if not assignee.is_active or assignee.role != expected_role:
        raise serializers.ValidationError(
            'Select an active employee with the matching role.')
    if not hasattr(manager, 'role_access_areas'):
        raise serializers.ValidationError('You cannot assign this task.')
    if manager.role not in [StaffRole.GENERAL_MANAGER, StaffRole.SYSTEM_ADMIN, StaffRole.HOUSEKEEPING_SUPERVISOR] and 'housekeeping' not in manager.role_access_areas():
        raise serializers.ValidationError(
            'You cannot assign housekeeping or maintenance tasks.')
    active_housekeeping = HousekeepingTask.objects.filter(
        assigned_to=assignee,
        status__in=['PENDING', 'IN_PROGRESS', 'INSPECTION_REQUIRED'],
    )
    active_maintenance = MaintenanceTicket.objects.filter(
        assigned_to=assignee,
        status__in=['OPEN', 'IN_PROGRESS'],
    )
    if isinstance(instance, HousekeepingTask):
        active_housekeeping = active_housekeeping.exclude(pk=instance.pk)
    elif isinstance(instance, MaintenanceTicket):
        active_maintenance = active_maintenance.exclude(pk=instance.pk)
    if active_housekeeping.exists() or active_maintenance.exists():
        raise serializers.ValidationError(
            'This employee already has active assigned work.')
    return assignee


class HousekeepingTaskSerializer(serializers.ModelSerializer):
    room_number = serializers.CharField(
        source='room.room_number', read_only=True)
    room_type = serializers.CharField(
        source='room.room_type.name', read_only=True)
    assigned_to_name = serializers.CharField(
        source='assigned_to.full_name', read_only=True)
    inspected_by_name = serializers.CharField(
        source='inspected_by.full_name', read_only=True)
    assigned_to = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(is_active=True), required=False, allow_null=True)

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

    def validate_assigned_to(self, assignee):
        request = self.context.get('request')
        if request is None:
            return assignee
        return validate_task_assignee(assignee, request, StaffRole.HOUSEKEEPER, self.instance)


class MaintenanceTicketSerializer(serializers.ModelSerializer):
    room_number = serializers.CharField(
        source='room.room_number', read_only=True)
    assigned_to_name = serializers.CharField(
        source='assigned_to.full_name', read_only=True)
    reported_by_name = serializers.CharField(
        source='reported_by.full_name', read_only=True)
    assigned_to = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(is_active=True), required=False, allow_null=True)

    class Meta:
        model = MaintenanceTicket
        fields = [
            'id', 'room', 'room_number', 'title', 'category', 'priority', 'status',
            'assigned_to', 'assigned_to_name', 'reported_by', 'reported_by_name',
            'notes', 'created_at', 'resolved_at',
        ]
        read_only_fields = ['id', 'reported_by', 'created_at', 'resolved_at']

    def validate_assigned_to(self, assignee):
        request = self.context.get('request')
        if request is None:
            return assignee
        return validate_task_assignee(assignee, request, StaffRole.MAINTENANCE, self.instance)
