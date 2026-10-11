from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.reservations.views import ReservationViewSet, RoomHoldViewSet

router = DefaultRouter()
router.register(r'reservations', ReservationViewSet, basename='reservation')
router.register(r'holds', RoomHoldViewSet, basename='room-hold')

urlpatterns = [
    path('', include(router.urls)),
]
