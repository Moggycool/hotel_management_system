from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.inventory.views import IngredientViewSet, RecipeIngredientViewSet, StockMovementViewSet

router = DefaultRouter()
router.register(r'ingredients', IngredientViewSet, basename='ingredient')
router.register(r'recipes', RecipeIngredientViewSet,
                basename='recipe-ingredient')
router.register(r'movements', StockMovementViewSet, basename='stock-movement')

urlpatterns = [
    path('', include(router.urls)),
]
