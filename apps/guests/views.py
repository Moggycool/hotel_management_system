from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from apps.guests.models import Guest
from apps.guests.serializers import GuestSerializer
from apps.accounts.permissions import IsFrontOfficeStaff
from apps.audit.mixins import AuditedModelViewSetMixin
from apps.audit.models import AuditModule


class GuestViewSet(AuditedModelViewSetMixin, viewsets.ModelViewSet):
    queryset = Guest.objects.all()
    serializer_class = GuestSerializer
    audit_module = AuditModule.AUTH
    audit_name = 'GUEST_PROFILE'
    audit_fields = ('id', 'vip_tier', 'total_stays', 'total_spent_etb')

    def get_permissions(self):
        permission_class = IsAuthenticated if self.action in [
            'list', 'retrieve'] else IsFrontOfficeStaff
        return [permission_class()]
