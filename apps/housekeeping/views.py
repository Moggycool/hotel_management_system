from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.accounts.permissions import IsHousekeepingStaff
from django.db import transaction
from .models import HousekeepingTask
from .serializers import HousekeepingTaskSerializer
from apps.rooms.models import RoomStatus
from apps.audit.mixins import AuditedModelViewSetMixin
from apps.audit.models import AuditModule
from apps.audit.services import log_audit_event


class HousekeepingTaskViewSet(AuditedModelViewSetMixin, viewsets.ModelViewSet):
    """
    Housekeeping operations: assign staff, transition room states (Dirty -> Cleaning -> Inspected -> Clean).
    """
    queryset = HousekeepingTask.objects.all().select_related(
        'room', 'assigned_to', 'inspected_by')
    serializer_class = HousekeepingTaskSerializer
    permission_classes = [IsHousekeepingStaff]
    audit_module = AuditModule.HOUSEKEEPING
    audit_name = 'HOUSEKEEPING_TASK'
    audit_fields = ('id', 'room_id', 'task_type',
                    'status', 'priority', 'assigned_to_id')

    def perform_create(self, serializer):
        with transaction.atomic():
            task = serializer.save()
            room = task.room
            room.housekeeping_status = 'DIRTY'
            if room.status == RoomStatus.VACANT_CLEAN:
                room.status = RoomStatus.VACANT_DIRTY
            room.save(update_fields=['housekeeping_status', 'status'])

    @action(detail=True, methods=['post'], url_path='start')
    def start_cleaning(self, request, pk=None):
        with transaction.atomic():
            task = HousekeepingTask.objects.select_for_update().get(pk=self.get_object().pk)
            if task.status != 'PENDING':
                return Response({'error': 'Only pending tasks can be started.'}, status=status.HTTP_409_CONFLICT)
            task.mark_in_progress(user=request.user)
            log_audit_event(
                module=AuditModule.HOUSEKEEPING,
                action='HOUSEKEEPING_STARTED',
                details=f'Housekeeping task {task.pk} started for room {task.room.room_number}.',
                request=request,
                before_state={'status': 'PENDING'},
                after_state={'status': task.status,
                             'assigned_to_id': str(task.assigned_to_id)},
            )
        return Response(HousekeepingTaskSerializer(task).data)

    @action(detail=True, methods=['post'], url_path='complete')
    def complete_cleaning(self, request, pk=None):
        with transaction.atomic():
            task = HousekeepingTask.objects.select_for_update().get(pk=self.get_object().pk)
            if task.status != 'IN_PROGRESS':
                return Response({'error': 'Only in-progress tasks can be completed.'}, status=status.HTTP_409_CONFLICT)
            task.mark_completed(user=request.user)
            log_audit_event(
                module=AuditModule.HOUSEKEEPING,
                action='HOUSEKEEPING_COMPLETED_FOR_INSPECTION',
                details=f'Housekeeping task {task.pk} completed and awaits inspection.',
                request=request,
                before_state={'status': 'IN_PROGRESS'},
                after_state={'status': task.status},
            )
        return Response(HousekeepingTaskSerializer(task).data)

    @action(detail=True, methods=['post'], url_path='inspect')
    def pass_inspection(self, request, pk=None):
        with transaction.atomic():
            task = HousekeepingTask.objects.select_for_update().get(pk=self.get_object().pk)
            if task.status != 'INSPECTION_REQUIRED':
                return Response({'error': 'Only tasks awaiting inspection can be approved.'}, status=status.HTTP_409_CONFLICT)
            task.pass_inspection(supervisor=request.user)
            log_audit_event(
                module=AuditModule.HOUSEKEEPING,
                action='HOUSEKEEPING_INSPECTION_PASSED',
                details=f'Supervisor approved housekeeping task {task.pk} for room {task.room.room_number}.',
                request=request,
                before_state={'status': 'INSPECTION_REQUIRED'},
                after_state={'status': task.status,
                             'room_status': task.room.status},
            )
        return Response(HousekeepingTaskSerializer(task).data)

    @action(detail=True, methods=['post'], url_path='reopen')
    def reopen_task(self, request, pk=None):
        with transaction.atomic():
            task = HousekeepingTask.objects.select_for_update(
            ).select_related('room').get(pk=self.get_object().pk)
            if task.status != 'COMPLETED':
                return Response({'error': 'Only completed tasks can be re-opened.'}, status=status.HTTP_409_CONFLICT)
            task.status = 'PENDING'
            task.completed_at = None
            task.inspected_by = None
            task.save(update_fields=['status', 'completed_at', 'inspected_by'])
            task.room.housekeeping_status = 'DIRTY'
            if task.room.status == RoomStatus.VACANT_CLEAN:
                task.room.status = RoomStatus.VACANT_DIRTY
            task.room.save(update_fields=['housekeeping_status', 'status'])
            log_audit_event(
                module=AuditModule.HOUSEKEEPING,
                action='HOUSEKEEPING_TASK_REOPENED',
                details=f'Completed housekeeping task {task.pk} reopened for room {task.room.room_number}.',
                request=request,
                before_state={'status': 'COMPLETED',
                              'room_status': RoomStatus.VACANT_CLEAN},
                after_state={'status': task.status,
                             'room_status': task.room.status},
            )
        return Response(HousekeepingTaskSerializer(task).data)
