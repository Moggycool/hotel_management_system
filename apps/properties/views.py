from django.db import transaction
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsGeneralManager
from apps.properties.models import Property
from apps.properties.serializers import PropertySerializer
from apps.audit.models import AuditModule
from apps.audit.services import log_audit_event


class CurrentPropertyConfigView(APIView):
    def get_permissions(self):
        permission_class = IsAuthenticated if self.request.method == 'GET' else IsGeneralManager
        return [permission_class()]

    def get_object(self):
        property_config = Property.objects.order_by('created_at').first()
        if property_config is None:
            property_config = Property.objects.create()
        return property_config

    def get(self, request):
        return Response(PropertySerializer(self.get_object()).data)

    @transaction.atomic
    def patch(self, request):
        property_config = self.get_object()
        tracked_fields = (
            'name', 'name_amharic', 'tagline', 'address', 'phone', 'email',
            'tin_number', 'currency', 'vat_rate', 'service_charge_rate',
            'telebirr_short_code', 'telebirr_merchant_id', 'check_in_time',
            'check_out_time', 'current_business_date', 'timezone_name',
        )
        before_state = {field: str(getattr(property_config, field))
                        for field in tracked_fields}
        serializer = PropertySerializer(
            property_config, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        after_state = {field: str(getattr(property_config, field))
                       for field in tracked_fields}
        log_audit_event(
            module=AuditModule.AUTH,
            action='PROPERTY_CONFIGURATION_UPDATED',
            details=f'Property configuration updated for {property_config.name}.',
            request=request,
            before_state=before_state,
            after_state=after_state,
        )
        return Response(serializer.data)
