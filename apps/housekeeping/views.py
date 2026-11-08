from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from django.db.models import Q
from django.utils import timezone
from apps.accounts.models import StaffRole, User
from apps.accounts.permissions import IsHousekeepingStaff
from django.db import transaction
from .models import HousekeepingTask, MaintenanceTicket
from .serializers import HousekeepingTaskSerializer, MaintenanceTicketSerializer
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

    def get_queryset(self):
        user = self.request.user
        if user.role in [StaffRole.HOUSEKEEPER, StaffRole.MAINTENANCE]:
            return self.queryset.filter(assigned_to=user)
        return self.queryset.filter(
            Q(assigned_to__reports_to=user) | Q(assigned_to__isnull=True)
        ).distinct()

    def _require_task_manager(self):
        user = self.request.user
        if user.role in [StaffRole.GENERAL_MANAGER, StaffRole.SYSTEM_ADMIN, StaffRole.HOUSEKEEPING_SUPERVISOR]:
            return
        if 'housekeeping' in user.role_access_areas():
            return
        raise PermissionDenied('Only a task supervisor can assign employees.')

    @action(detail=False, methods=['get'], url_path='available-staff')
    def available_staff(self, request):
        self._require_task_manager()
        work_type = request.query_params.get('work_type')
        if work_type not in ['housekeeping', 'maintenance']:
            return Response(
                {'detail': 'work_type must be housekeeping or maintenance.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        role = StaffRole.HOUSEKEEPER if work_type == 'housekeeping' else StaffRole.MAINTENANCE
        busy_housekeeping = HousekeepingTask.objects.filter(
            status__in=['PENDING', 'IN_PROGRESS', 'INSPECTION_REQUIRED'],
            assigned_to__isnull=False,
        ).values_list('assigned_to_id', flat=True)
        busy_maintenance = MaintenanceTicket.objects.filter(
            status__in=['OPEN', 'IN_PROGRESS'],
            assigned_to__isnull=False,
        ).values_list('assigned_to_id', flat=True)
        staff = User.objects.filter(
            reports_to=request.user,
            role=role,
            is_active=True,
        ).exclude(Q(id__in=busy_housekeeping) | Q(id__in=busy_maintenance))
        return Response([
            {'id': str(person.id), 'full_name': person.full_name,
             'role': person.role}
            for person in staff.order_by('full_name')
        ])

    def perform_create(self, serializer):
        with transaction.atomic():
            assigned_to = serializer.validated_data.get('assigned_to')
            if assigned_to is None and self.request.user.role == StaffRole.HOUSEKEEPER:
                assigned_to = self.request.user
            task = serializer.save(assigned_to=assigned_to)
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


class MaintenanceTicketViewSet(AuditedModelViewSetMixin, viewsets.ModelViewSet):
    queryset = MaintenanceTicket.objects.select_related(
        'room', 'assigned_to', 'reported_by')
    serializer_class = MaintenanceTicketSerializer
    permission_classes = [IsHousekeepingStaff]
    audit_module = AuditModule.HOUSEKEEPING
    audit_name = 'MAINTENANCE_TICKET'
    audit_fields = ('id', 'room_id', 'title', 'status',
                    'priority', 'assigned_to_id')

    def get_queryset(self):
        user = self.request.user
        if user.role == StaffRole.MAINTENANCE:
            return self.queryset.filter(assigned_to=user)
        return self.queryset.filter(
            Q(assigned_to__reports_to=user) | Q(assigned_to__isnull=True)
        ).distinct()

    def perform_create(self, serializer):
        if not (self.request.user.role in [StaffRole.GENERAL_MANAGER, StaffRole.SYSTEM_ADMIN, StaffRole.HOUSEKEEPING_SUPERVISOR]
                or 'housekeeping' in self.request.user.role_access_areas()):
            raise PermissionDenied(
                'Only a task supervisor can create maintenance work orders.')
        ticket = serializer.save(reported_by=self.request.user)
        if ticket.priority in ['HIGH', 'CRITICAL']:
            ticket.room.status = RoomStatus.MAINTENANCE
            ticket.room.save(update_fields=['status'])

    def perform_update(self, serializer):
        ticket = serializer.save()
        if ticket.status == 'RESOLVED' and ticket.resolved_at is None:
            ticket.resolved_at = timezone.now()
            ticket.save(update_fields=['resolved_at'])
