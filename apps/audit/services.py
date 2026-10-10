from apps.audit.models import AuditLog, AuditModule, AuditSeverity


def log_audit_event(
    module: AuditModule,
    action: str,
    details: str,
    request=None,
    actor=None,
    severity: AuditSeverity = AuditSeverity.INFO,
    before_state=None,
    after_state=None,
):
    ip_address = None
    actor_id = None
    actor_name = 'System Process'
    actor_role = 'SYSTEM'

    if request:
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip_address = x_forwarded_for.split(',')[0].strip()
        else:
            ip_address = request.META.get('REMOTE_ADDR')

        if hasattr(request, 'user') and request.user.is_authenticated:
            actor = request.user

    if actor:
        actor_id = actor.id
        actor_name = actor.full_name
        actor_role = actor.role

    return AuditLog.objects.create(
        module=module,
        action=action,
        details=details,
        actor_id=actor_id,
        actor_name=actor_name,
        actor_role=actor_role,
        ip_address=ip_address,
        severity=severity,
        before_state=before_state,
        after_state=after_state,
    )
