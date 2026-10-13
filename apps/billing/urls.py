from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CashierShiftViewSet, FolioViewSet

router = DefaultRouter()
router.register(r'folios', FolioViewSet, basename='folio')
router.register(r'shifts', CashierShiftViewSet, basename='cashier-shift')

urlpatterns = [
    path('', include(router.urls)),
]
