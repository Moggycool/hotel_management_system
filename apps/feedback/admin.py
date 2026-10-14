from django.contrib import admin

from apps.feedback.models import GuestFeedback


@admin.register(GuestFeedback)
class GuestFeedbackAdmin(admin.ModelAdmin):
    list_display = ('submitted_at', 'rating', 'category',
                    'status', 'guest_name', 'reservation_code')
    list_filter = ('status', 'category', 'rating', 'submitted_at')
    search_fields = ('guest_name', 'reservation_code', 'message')
    readonly_fields = ('id', 'submitted_at', 'reviewed_by', 'reviewed_at')
