from django.contrib import admin
from apps.audit.models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ('timestamp', 'actor_name', 'actor_role',
                    'module', 'action', 'severity', 'ip_address')
    list_filter = ('module', 'severity', 'actor_role', 'timestamp')
    search_fields = ('actor_name', 'action', 'details', 'ip_address')
    ordering = ('-timestamp',)

    # Immutable: Prevent additions, updates, or deletions via Django Admin
    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    def has_change_permission(self, request, obj=None):
        return False
