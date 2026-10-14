from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, BasePermission
from rest_framework.response import Response

from apps.accounts.models import StaffRole
from apps.audit.models import AuditModule
from apps.audit.services import log_audit_event
from apps.feedback.models import GuestFeedback
from apps.feedback.serializers import (
    GuestFeedbackReviewSerializer,
    GuestFeedbackSubmissionSerializer,
)
from apps.feedback.throttles import GuestFeedbackThrottle


class IsFeedbackManager(BasePermission):
    allowed_roles = {
        StaffRole.GENERAL_MANAGER,
        StaffRole.FRONT_OFFICE_MANAGER,
        StaffRole.SYSTEM_ADMIN,
    }

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user and user.is_authenticated
            and (user.is_superuser or user.role in self.allowed_roles)
        )


class GuestFeedbackViewSet(viewsets.ModelViewSet):
    queryset = GuestFeedback.objects.select_related('reviewed_by').all()
    http_method_names = ['get', 'post', 'patch', 'head', 'options']

    def get_permissions(self):
        permission_class = AllowAny if self.action == 'create' else IsFeedbackManager
        return [permission_class()]

    def get_throttles(self):
        return [GuestFeedbackThrottle()] if self.action == 'create' else super().get_throttles()

    def get_serializer_class(self):
        return GuestFeedbackSubmissionSerializer if self.action == 'create' else GuestFeedbackReviewSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        feedback = serializer.save()
        return Response(
            {'id': str(feedback.id), 'received': True},
            status=status.HTTP_201_CREATED,
        )

    def partial_update(self, request, *args, **kwargs):
        feedback = self.get_object()
        serializer = self.get_serializer(
            feedback, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        before_status = feedback.status
        feedback = serializer.save(
            reviewed_by=request.user,
            reviewed_at=timezone.now(),
        )
        log_audit_event(
            module=AuditModule.FEEDBACK,
            action='GUEST_FEEDBACK_REVIEWED',
            details=f'Guest feedback {feedback.pk} reviewed by {request.user.full_name}.',
            request=request,
            before_state={'status': before_status},
            after_state={'status': feedback.status},
        )
        return Response(self.get_serializer(feedback).data)
