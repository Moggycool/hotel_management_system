from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.kitchen.views import KitchenTicketViewSet

router = DefaultRouter()
router.register(r'tickets', KitchenTicketViewSet, basename='kitchen-ticket')

urlpatterns = [
    path('', include(router.urls)),
]
