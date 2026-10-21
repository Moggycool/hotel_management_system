from rest_framework import serializers

from apps.guests.models import Guest


ALLOWED_ID_EXTENSIONS = ('.jpg', '.jpeg', '.png', '.pdf')
MAX_ID_DOCUMENT_BYTES = 5 * 1024 * 1024


class GuestSerializer(serializers.ModelSerializer):
    has_id_document = serializers.SerializerMethodField()

    class Meta:
        model = Guest
        fields = '__all__'
        extra_kwargs = {'id_document': {'write_only': True, 'required': False}}

    def get_has_id_document(self, obj):
        return bool(obj.id_document)

    def validate_id_document(self, value):
        if value and not value.name.lower().endswith(ALLOWED_ID_EXTENSIONS):
            raise serializers.ValidationError('Upload a JPG, PNG or PDF file.')
        if value and value.size > MAX_ID_DOCUMENT_BYTES:
            raise serializers.ValidationError('File must be 5 MB or smaller.')
        return value
