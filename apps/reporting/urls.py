from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.reporting.views import NightAuditViewSet

router = DefaultRouter()
router.register(r'night-audit', NightAuditViewSet, basename='night-audit')

urlpatterns = [
    path('', include(router.urls)),
]
