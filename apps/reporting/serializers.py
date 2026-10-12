from rest_framework import serializers
from apps.reporting.models import NightAuditSession


class NightAuditSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = NightAuditSession
        fields = '__all__'


class ExecuteAuditPayloadSerializer(serializers.Serializer):
    business_date = serializers.DateField(required=True)
    next_business_date = serializers.DateField(required=False)
    closed_by = serializers.CharField(required=False, default='Night Auditor')
    auditor_role = serializers.CharField(required=False, default='Front Office Manager')
    auto_post_room_charges = serializers.BooleanField(required=False, default=True)
    process_no_shows = serializers.BooleanField(required=False, default=True)
    notes = serializers.CharField(required=False, allow_blank=True, default='')
    snapshot_data = serializers.DictField(required=False, default=dict)
