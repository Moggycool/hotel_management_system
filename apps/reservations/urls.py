from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.reservations.views import ReservationViewSet, RoomHoldViewSet

router = DefaultRouter()
router.register(r'holds', RoomHoldViewSet, basename='room-hold')
router.register(r'', ReservationViewSet, basename='reservation')

urlpatterns = [
    path('', include(router.urls)),
]
