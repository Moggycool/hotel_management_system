from django.conf import settings
from django.core.mail import send_mail
from django.db import transaction
from django.db.models import ProtectedError
from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, BasePermission, IsAuthenticated
from rest_framework.throttling import AnonRateThrottle
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from django.utils.dateparse import parse_date
from django.utils import timezone
from datetime import timedelta

from apps.rooms.models import RatePlan, RatePlanProposal, Room, RoomStatus, RoomType
from apps.rooms.serializers import (
    PublicAvailableRoomSerializer,
    RatePlanSerializer,
    RatePlanProposalSerializer,
    RoomSerializer,
    RoomTypeSerializer,
)
from apps.rooms.services import AvailabilityEngine
from apps.accounts.models import StaffRole, User
from apps.accounts.permissions import IsGeneralManager, IsHousekeepingStaff, IsRoomManagementStaff
from apps.audit.services import log_audit_event
from apps.audit.mixins import AuditedModelViewSetMixin
from apps.audit.models import AuditModule
from apps.billing.models import Folio
from apps.housekeeping.models import MaintenanceTicket
from apps.reservations.models import ReservationStatus


class PublicAvailabilityThrottle(AnonRateThrottle):
    rate = '60/minute'

    def get_rate(self):
        return self.rate


class IsSystemAdministrator(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user and request.user.is_authenticated
            and (request.user.is_superuser or request.user.role == StaffRole.SYSTEM_ADMIN)
        )


class IsRatePlanProposalStaff(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user and request.user.is_authenticated
            and request.user.role in [StaffRole.FRONT_OFFICE_MANAGER, StaffRole.GENERAL_MANAGER]
        )


class IsFrontOfficeManager(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated
                    and request.user.role == StaffRole.FRONT_OFFICE_MANAGER)


class IsGeneralManagerOnly(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated
                    and request.user.role == StaffRole.GENERAL_MANAGER)


class RoomTypeViewSet(AuditedModelViewSetMixin, viewsets.ModelViewSet):
    queryset = RoomType.objects.all()
    serializer_class = RoomTypeSerializer
    audit_module = AuditModule.ROOMS
    audit_name = 'ROOM_TYPE'
    audit_fields = ('id', 'name', 'base_price_etb')

    def get_permissions(self):
        permission_class = IsAuthenticated if self.action in [
            'list', 'retrieve'] else IsGeneralManager
        return [permission_class()]

    def perform_destroy(self, instance):
        if instance.rooms.exists():
            raise ValidationError({
                'detail': 'Cannot delete a room type while rooms still use it.'
            })
        try:
            super().perform_destroy(instance)
        except ProtectedError as error:
            raise ValidationError({
                'detail': 'Cannot delete a room type while it is referenced.'
            }) from error


class RatePlanViewSet(AuditedModelViewSetMixin, viewsets.ModelViewSet):
    queryset = RatePlan.objects.all()
    serializer_class = RatePlanSerializer
    audit_module = AuditModule.ROOMS
    audit_name = 'RATE_PLAN'
    audit_fields = ('id', 'name', 'multiplier', 'is_active')

    def get_permissions(self):
        permission_class = IsAuthenticated if self.action in [
            'list', 'retrieve'] else IsSystemAdministrator
        return [permission_class()]


class RatePlanProposalViewSet(AuditedModelViewSetMixin, viewsets.ModelViewSet):
    queryset = RatePlanProposal.objects.select_related(
        'target_rate_plan', 'proposed_by', 'approved_by').all()
    serializer_class = RatePlanProposalSerializer
    http_method_names = ['get', 'post', 'head', 'options']
    audit_module = AuditModule.ROOMS
    audit_name = 'RATE_PLAN_PROPOSAL'
    audit_fields = ('id', 'target_rate_plan_id', 'name', 'status')

    def get_permissions(self):
        if self.action == 'create':
            permission_class = IsFrontOfficeManager
        elif self.action in ['approve', 'reject']:
            permission_class = IsGeneralManagerOnly
        else:
            permission_class = IsRatePlanProposalStaff
        return [permission_class()]

    def perform_create(self, serializer):
        serializer.save(proposed_by=self.request.user)

    @action(detail=True, methods=['post'])
    @transaction.atomic
    def approve(self, request, pk=None):
        proposal = get_object_or_404(
            RatePlanProposal.objects.select_for_update(), pk=pk)
        if proposal.status != 'PENDING':
            return Response({'detail': 'Only pending proposals can be approved.'}, status=status.HTTP_409_CONFLICT)

        values = {
            'name': proposal.name,
            'multiplier': proposal.multiplier,
            'fixed_surcharge_etb': proposal.fixed_surcharge_etb,
            'description': proposal.description,
            'is_resident_only': proposal.is_resident_only,
        }
        if proposal.target_rate_plan_id:
            rate_plan = RatePlan.objects.select_for_update().get(
                pk=proposal.target_rate_plan_id)
            for field, value in values.items():
                setattr(rate_plan, field, value)
            rate_plan.save()
        else:
            if RatePlan.objects.filter(name=proposal.name).exists():
                return Response({'name': 'A rate plan with this name already exists.'}, status=status.HTTP_409_CONFLICT)
            rate_plan = RatePlan.objects.create(**values)

        proposal.status = 'APPROVED'
        proposal.approved_by = request.user
        proposal.decision_notes = str(
            request.data.get('decision_notes', '')).strip()
        proposal.decided_at = timezone.now()
        proposal.save(update_fields=[
            'status', 'approved_by', 'decision_notes', 'decided_at',
        ])
        log_audit_event(
            module=AuditModule.ROOMS,
            action='RATE_PLAN_PROPOSAL_APPROVED',
            details=f'Rate plan proposal {proposal.name} approved by {request.user.full_name}.',
            request=request,
            after_state={
                **self.audit_snapshot(proposal),
                'rate_plan_id': str(rate_plan.pk),
                'decision_notes': proposal.decision_notes,
            },
        )
        return Response(self.get_serializer(proposal).data)

    @action(detail=True, methods=['post'])
    @transaction.atomic
    def reject(self, request, pk=None):
        proposal = get_object_or_404(
            RatePlanProposal.objects.select_for_update(), pk=pk)
        if proposal.status != 'PENDING':
            return Response({'detail': 'Only pending proposals can be rejected.'}, status=status.HTTP_409_CONFLICT)
        notes = str(request.data.get('decision_notes', '')).strip()
        if not notes:
            return Response({'decision_notes': 'Provide a rejection reason.'}, status=status.HTTP_400_BAD_REQUEST)
        proposal.status = 'REJECTED'
        proposal.approved_by = request.user
        proposal.decision_notes = notes
        proposal.decided_at = timezone.now()
        proposal.save(update_fields=[
            'status', 'approved_by', 'decision_notes', 'decided_at',
        ])
        log_audit_event(
            module=AuditModule.ROOMS,
            action='RATE_PLAN_PROPOSAL_REJECTED',
            details=f'Rate plan proposal {proposal.name} rejected by {request.user.full_name}.',
            request=request,
            after_state=self.audit_snapshot(proposal),
        )
        return Response(self.get_serializer(proposal).data)


class RoomViewSet(AuditedModelViewSetMixin, viewsets.ModelViewSet):
    queryset = Room.objects.select_related('room_type').filter(is_active=True)
    serializer_class = RoomSerializer
    audit_module = AuditModule.ROOMS
    audit_name = 'ROOM'
    audit_fields = ('id', 'room_number', 'status', 'housekeeping_status')

    def get_throttles(self):
        if self.action == 'public_availability':
            return [PublicAvailabilityThrottle()]
        return super().get_throttles()

    def get_permissions(self):
        if self.action == 'public_availability':
            permission_class = AllowAny
        elif self.action == 'request_out_of_order':
            permission_class = IsHousekeepingStaff
        elif self.action == 'set_operational_status':
            permission_class = IsAuthenticated
        elif self.action in ['list', 'retrieve', 'availability']:
            permission_class = IsAuthenticated
        else:
            permission_class = IsRoomManagementStaff
        return [permission_class()]

    @action(detail=True, methods=['post'], url_path='request-out-of-order')
    @transaction.atomic
    def request_out_of_order(self, request, pk=None):
        if request.user.role not in [StaffRole.MAINTENANCE, StaffRole.HOUSEKEEPING_SUPERVISOR]:
            return Response({'detail': 'Only Maintenance or the Housekeeping Supervisor can request out-of-order status.'}, status=status.HTTP_403_FORBIDDEN)

        room = Room.objects.select_for_update().get(pk=self.get_object().pk)
        reason = str(request.data.get('reason', '')).strip()
        expected_return_date = parse_date(
            str(request.data.get('expected_return_date', '')))
        ticket_id = request.data.get('maintenance_ticket_id')
        if not reason or not expected_return_date or not ticket_id:
            return Response({'detail': 'Reason, expected return date, and maintenance ticket are required.'}, status=status.HTTP_400_BAD_REQUEST)
        if expected_return_date <= timezone.localdate():
            return Response({'expected_return_date': 'Expected return date must be in the future.'}, status=status.HTTP_400_BAD_REQUEST)

        ticket = MaintenanceTicket.objects.filter(
            pk=ticket_id,
            room=room,
            status__in=['OPEN', 'IN_PROGRESS'],
        ).first()
        if ticket is None:
            return Response({'maintenance_ticket_id': 'Choose an open maintenance work order for this room.'}, status=status.HTTP_400_BAD_REQUEST)

        room.status_reason = reason
        room.expected_return_date = expected_return_date
        room.out_of_order_ticket = ticket
        room.out_of_order_requested_by = request.user
        room.out_of_order_confirmed_by = None
        room.save(update_fields=[
            'status_reason', 'expected_return_date', 'out_of_order_ticket',
            'out_of_order_requested_by', 'out_of_order_confirmed_by',
        ])
        log_audit_event(
            module=AuditModule.ROOMS,
            action='ROOM_OUT_OF_ORDER_REQUESTED',
            details=f'Out-of-order status requested for room {room.room_number}: {reason}.',
            request=request,
            after_state={
                'room_id': str(room.pk), 'maintenance_ticket_id': str(ticket.pk),
                'expected_return_date': str(expected_return_date), 'reason': reason,
            },
        )
        return Response(RoomSerializer(room).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='confirm-out-of-order')
    @transaction.atomic
    def confirm_out_of_order(self, request, pk=None):
        if request.user.role != StaffRole.FRONT_OFFICE_MANAGER:
            return Response({'detail': 'Only the Front Office Manager can confirm out-of-order status.'}, status=status.HTTP_403_FORBIDDEN)

        room = Room.objects.select_for_update().get(pk=self.get_object().pk)
        ticket = room.out_of_order_ticket
        if not room.out_of_order_requested_by_id or not room.expected_return_date or not room.status_reason or not ticket:
            return Response({'detail': 'This room has no complete out-of-order request.'}, status=status.HTTP_409_CONFLICT)
        if ticket.status not in ['OPEN', 'IN_PROGRESS'] or ticket.room_id != room.id:
            return Response({'detail': 'The linked maintenance work order is no longer open.'}, status=status.HTTP_409_CONFLICT)
        if room.reservations.filter(status=ReservationStatus.CHECKED_IN).exists():
            return Response({'detail': 'Move the in-house guest before taking the room out of order.'}, status=status.HTTP_409_CONFLICT)
        if Folio.objects.filter(reservation__room=room, is_closed=False).exists():
            return Response({'detail': 'Close the guest folio before taking this room out of order.'}, status=status.HTTP_409_CONFLICT)

        affected = list(room.reservations.filter(
            status__in=[ReservationStatus.PAYMENT_PENDING,
                        ReservationStatus.CONFIRMED],
            check_out_date__gt=timezone.localdate(),
            check_in_date__lt=room.expected_return_date,
        ).values('id', 'confirmation_code', 'check_in_date', 'check_out_date'))
        before_state = self.audit_snapshot(room)
        room.status = 'OUT_OF_ORDER'
        room.out_of_order_confirmed_by = request.user
        room.save(update_fields=['status', 'out_of_order_confirmed_by'])
        log_audit_event(
            module=AuditModule.ROOMS,
            action='ROOM_OUT_OF_ORDER_CONFIRMED',
            details=f'Out-of-order status confirmed for room {room.room_number} through {room.expected_return_date}.',
            request=request,
            before_state=before_state,
            after_state={
                **self.audit_snapshot(room),
                'affected_reservations': [item['confirmation_code'] for item in affected],
            },
        )
        warnings = [
            f"Reservation {item['confirmation_code']} overlaps the room outage."
            for item in affected
        ]
        if room.expected_return_date > timezone.localdate() + timedelta(days=7):
            warnings.append(
                'Out-of-order period exceeds 7 days; a notification email was sent to active General Managers.')
            recipients = list(User.objects.filter(
                role=StaffRole.GENERAL_MANAGER,
                is_active=True,
            ).exclude(email='').values_list('email', flat=True))
            if recipients:
                subject = f'Room {room.room_number} is out of order for more than 7 days'
                message = (
                    f'Room {room.room_number} was confirmed out of order by '
                    f'{request.user.full_name}. Reason: {room.status_reason}. '
                    f'Expected return date: {room.expected_return_date}. '
                    f'Maintenance work order: {ticket.pk}.'
                )
                transaction.on_commit(lambda: send_mail(
                    subject,
                    message,
                    getattr(settings, 'DEFAULT_FROM_EMAIL', None),
                    recipients,
                    fail_silently=True,
                ))
        return Response({'room': RoomSerializer(room).data, 'warnings': warnings}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='set-operational-status')
    @transaction.atomic
    def set_operational_status(self, request, pk=None):
        room = Room.objects.select_for_update().get(pk=self.get_object().pk)
        target = request.data.get('status')
        reason = str(request.data.get('reason', '')).strip()
        user_role = request.user.role

        if target == RoomStatus.OUT_OF_SERVICE:
            if user_role != StaffRole.HOUSEKEEPING_SUPERVISOR:
                return Response({'detail': 'Only the Housekeeping Supervisor can set a room out of service.'}, status=status.HTTP_403_FORBIDDEN)
            if room.status not in [RoomStatus.VACANT_CLEAN, RoomStatus.VACANT_DIRTY]:
                return Response({'detail': 'Only a vacant room can be set out of service.'}, status=status.HTTP_409_CONFLICT)
        elif target == RoomStatus.BLOCKED:
            if user_role != StaffRole.FRONT_OFFICE_MANAGER:
                return Response({'detail': 'Only the Front Office Manager can block a room.'}, status=status.HTTP_403_FORBIDDEN)
            if room.status != RoomStatus.VACANT_CLEAN:
                return Response({'detail': 'Only an inspected, vacant room can be blocked.'}, status=status.HTTP_409_CONFLICT)
        elif target == RoomStatus.VACANT_CLEAN:
            if user_role != StaffRole.FRONT_OFFICE_MANAGER:
                return Response({'detail': 'Only the Front Office Manager can restore an operationally blocked room.'}, status=status.HTTP_403_FORBIDDEN)
            if room.status not in [
                RoomStatus.OUT_OF_SERVICE,
                RoomStatus.OUT_OF_ORDER,
                RoomStatus.BLOCKED,
                RoomStatus.MAINTENANCE,
            ]:
                return Response({'detail': 'This room is not in a state that can be restored by Front Office.'}, status=status.HTTP_409_CONFLICT)
            if room.housekeeping_status != 'CLEAN':
                return Response({'detail': 'Housekeeping must inspect the room before it can return to sellable status.'}, status=status.HTTP_409_CONFLICT)
            if Folio.objects.filter(reservation__room=room, is_closed=False).exists():
                return Response({'detail': 'Close the guest folio before making this room vacant.'}, status=status.HTTP_409_CONFLICT)
            if room.reservations.filter(status=ReservationStatus.CHECKED_IN).exists():
                return Response({'detail': 'An in-house guest is still assigned to this room.'}, status=status.HTTP_409_CONFLICT)
            if room.status == RoomStatus.OUT_OF_ORDER and room.out_of_order_ticket_id:
                if room.out_of_order_ticket.status != 'RESOLVED':
                    return Response({'detail': 'Resolve the linked maintenance work order before restoring this room.'}, status=status.HTTP_409_CONFLICT)
        else:
            return Response({'status': 'Choose OUT_OF_SERVICE, BLOCKED, or VACANT_CLEAN.'}, status=status.HTTP_400_BAD_REQUEST)

        if target != RoomStatus.VACANT_CLEAN and not reason:
            return Response({'reason': 'A reason is required for this status change.'}, status=status.HTTP_400_BAD_REQUEST)
        if room.reservations.filter(status=ReservationStatus.CHECKED_IN).exists():
            return Response({'detail': 'Move the in-house guest before changing the room to this status.'}, status=status.HTTP_409_CONFLICT)

        before_state = self.audit_snapshot(room)
        room.status = target
        room.status_reason = reason if target != RoomStatus.VACANT_CLEAN else ''
        if target == RoomStatus.VACANT_CLEAN:
            room.expected_return_date = None
            room.out_of_order_ticket = None
            room.out_of_order_requested_by = None
            room.out_of_order_confirmed_by = None
        room.save()
        log_audit_event(
            module=AuditModule.ROOMS,
            action='ROOM_OPERATIONAL_STATUS_CHANGED',
            details=f'Room {room.room_number} status changed to {room.get_status_display()}.',
            request=request,
            before_state=before_state,
            after_state=self.audit_snapshot(room),
        )
        return Response(RoomSerializer(room).data)

    @transaction.atomic
    def perform_destroy(self, instance):
        room = Room.objects.select_for_update().get(pk=instance.pk)
        active_reservation = room.reservations.filter(
            status__in=['PAYMENT_PENDING', 'CONFIRMED', 'CHECKED_IN'],
        ).first()
        if active_reservation:
            raise ValidationError({
                'detail': (
                    f'Room {room.room_number} cannot be removed while reservation '
                    f'{active_reservation.confirmation_code} is active.'
                ),
            })

        before_state = self.audit_snapshot(room)
        room.is_active = False
        room.save(update_fields=['is_active'])
        log_audit_event(
            module=self.audit_module,
            action='ROOM_DEACTIVATED',
            details=f'Room {room.room_number} was removed from active inventory.',
            request=self.request,
            before_state=before_state,
            after_state={**before_state, 'is_active': False},
        )

    @action(detail=False, methods=['get'], url_path='availability')
    def availability(self, request):
        check_in = parse_date(request.query_params.get('check_in', ''))
        check_out = parse_date(request.query_params.get('check_out', ''))
        if not check_in or not check_out:
            return Response(
                {'detail': 'Provide valid check_in and check_out dates in YYYY-MM-DD format.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if check_in >= check_out:
            return Response(
                {'detail': 'Check-out must be after check-in.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        allow_uninspected = request.query_params.get(
            'inspection_override') == 'true'
        if allow_uninspected and request.user.role != StaffRole.FRONT_OFFICE_MANAGER:
            return Response({'detail': 'Only the Front Office Manager can request an inspection override.'}, status=status.HTTP_403_FORBIDDEN)
        available_rooms = AvailabilityEngine.get_available_rooms(
            check_in, check_out, allow_uninspected=allow_uninspected)
        return Response(RoomSerializer(available_rooms, many=True).data)

    @action(detail=False, methods=['get'], url_path='public-availability')
    def public_availability(self, request):
        check_in = parse_date(request.query_params.get('check_in', ''))
        check_out = parse_date(request.query_params.get('check_out', ''))
        if not check_in or not check_out:
            return Response(
                {'detail': 'Provide valid check_in and check_out dates in YYYY-MM-DD format.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if check_in < timezone.localdate() or check_in >= check_out:
            return Response(
                {'detail': 'Arrival cannot be in the past and check-out must be after check-in.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        rooms = AvailabilityEngine.get_available_rooms(
            check_in, check_out).filter(housekeeping_status='CLEAN')
        return Response(PublicAvailableRoomSerializer(rooms, many=True).data)
