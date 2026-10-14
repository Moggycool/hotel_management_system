from rest_framework.routers import DefaultRouter

from apps.feedback.views import GuestFeedbackViewSet

router = DefaultRouter()
router.register(r'', GuestFeedbackViewSet, basename='guest-feedback')

urlpatterns = router.urls
