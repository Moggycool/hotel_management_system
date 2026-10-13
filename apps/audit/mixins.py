from datetime import date, datetime, time
from decimal import Decimal

from django.db import transaction

from apps.audit.models import AuditModule
from apps.audit.services import log_audit_event


class AuditedModelViewSetMixin:
    audit_module = AuditModule.AUTH
    audit_name = 'RECORD'
    audit_fields = ('id',)
    audit_create_action = None

    def audit_snapshot(self, instance):
        snapshot = {}
        for field_name in self.audit_fields:
            value = getattr(instance, field_name, None)
            if hasattr(value, 'pk'):
                value = value.pk
            if isinstance(value, (date, datetime, time, Decimal)):
                value = value.isoformat() if hasattr(value, 'isoformat') else str(value)
            if value is not None:
                snapshot[field_name] = str(value) if not isinstance(
                    value, (str, int, float, bool)) else value
        return snapshot

    @transaction.atomic
    def perform_create(self, serializer):
        instance = serializer.save()
        state = self.audit_snapshot(instance)
        action = self.audit_create_action or f'{self.audit_name}_CREATED'
        log_audit_event(
            module=self.audit_module,
            action=action,
            details=f'{self.audit_name} created ({instance.pk}).',
            request=self.request,
            after_state=state,
        )

    @transaction.atomic
    def perform_update(self, serializer):
        before_state = self.audit_snapshot(serializer.instance)
        instance = serializer.save()
        log_audit_event(
            module=self.audit_module,
            action=f'{self.audit_name}_UPDATED',
            details=f'{self.audit_name} updated ({instance.pk}).',
            request=self.request,
            before_state=before_state,
            after_state=self.audit_snapshot(instance),
        )

    @transaction.atomic
    def perform_destroy(self, instance):
        before_state = self.audit_snapshot(instance)
        instance_id = instance.pk
        instance.delete()
        log_audit_event(
            module=self.audit_module,
            action=f'{self.audit_name}_DELETED',
            details=f'{self.audit_name} deleted ({instance_id}).',
            request=self.request,
            before_state=before_state,
        )
