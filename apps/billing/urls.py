from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import FolioViewSet

router = DefaultRouter()
router.register(r'folios', FolioViewSet, basename='folio')

urlpatterns = [
    path('', include(router.urls)),
]
