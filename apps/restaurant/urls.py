from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.restaurant.views import RestaurantMenuItemViewSet, RestaurantOrderViewSet

router = DefaultRouter()
router.register(r'menu-items', RestaurantMenuItemViewSet,
                basename='restaurant-menu-item')
router.register(r'orders', RestaurantOrderViewSet, basename='restaurant-order')

urlpatterns = [
    path('', include(router.urls)),
]
