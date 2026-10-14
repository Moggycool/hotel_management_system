from rest_framework import serializers

from apps.feedback.models import GuestFeedback


class GuestFeedbackSubmissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = GuestFeedback
        fields = ['id', 'rating', 'category', 'message',
                  'guest_name', 'reservation_code', 'submitted_at']
        read_only_fields = ['id', 'submitted_at']

    def validate_message(self, value):
        value = value.strip()
        if len(value) < 10:
            raise serializers.ValidationError(
                'Please provide at least 10 characters of feedback.')
        return value

    def validate_guest_name(self, value):
        return value.strip()

    def validate_reservation_code(self, value):
        return value.strip().upper()


class GuestFeedbackReviewSerializer(serializers.ModelSerializer):
    reviewed_by_name = serializers.CharField(
        source='reviewed_by.full_name', read_only=True)
    category_display = serializers.CharField(
        source='get_category_display', read_only=True)
    status_display = serializers.CharField(
        source='get_status_display', read_only=True)

    class Meta:
        model = GuestFeedback
        fields = [
            'id', 'rating', 'category', 'category_display', 'message',
            'guest_name', 'reservation_code', 'submitted_at', 'status',
            'status_display', 'staff_notes', 'reviewed_by', 'reviewed_by_name',
            'reviewed_at',
        ]
        read_only_fields = [
            'id', 'rating', 'category', 'message', 'guest_name',
            'reservation_code', 'submitted_at', 'reviewed_by', 'reviewed_at',
        ]
