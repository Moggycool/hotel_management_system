from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.rooms.views import RatePlanViewSet, RoomTypeViewSet, RoomViewSet

router = DefaultRouter()
router.register(r'room-types', RoomTypeViewSet, basename='room-type')
router.register(r'rate-plans', RatePlanViewSet, basename='rate-plan')
router.register(r'', RoomViewSet, basename='room')

urlpatterns = [
    path('', include(router.urls)),
]
