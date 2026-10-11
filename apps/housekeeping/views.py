from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import HousekeepingTask
from .serializers import HousekeepingTaskSerializer


class HousekeepingTaskViewSet(viewsets.ModelViewSet):
    """
    Housekeeping operations: assign staff, transition room states (Dirty -> Cleaning -> Inspected -> Clean).
    """
    queryset = HousekeepingTask.objects.all().select_related(
        'room', 'assigned_to', 'inspected_by')
    serializer_class = HousekeepingTaskSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=True, methods=['post'], url_path='start')
    def start_cleaning(self, request, pk=None):
        task = self.get_object()
        task.mark_in_progress(user=request.user)
        return Response(HousekeepingTaskSerializer(task).data)

    @action(detail=True, methods=['post'], url_path='complete')
    def complete_cleaning(self, request, pk=None):
        task = self.get_object()
        task.mark_completed(user=request.user)
        return Response(HousekeepingTaskSerializer(task).data)

    @action(detail=True, methods=['post'], url_path='inspect')
    def pass_inspection(self, request, pk=None):
        task = self.get_object()
        task.pass_inspection(supervisor=request.user)
        return Response(HousekeepingTaskSerializer(task).data)
