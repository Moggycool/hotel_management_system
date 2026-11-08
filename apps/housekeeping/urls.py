from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import HousekeepingTaskViewSet, MaintenanceTicketViewSet

router = DefaultRouter()
router.register(r'tasks', HousekeepingTaskViewSet,
                basename='housekeeping-task')
router.register(r'maintenance', MaintenanceTicketViewSet,
                basename='maintenance-ticket')

urlpatterns = [
    path('', include(router.urls)),
]
