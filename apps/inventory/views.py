from decimal import Decimal

from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.accounts.permissions import IsGeneralManager, IsInventoryStaff, IsRecipeManager
from apps.audit.mixins import AuditedModelViewSetMixin
from apps.audit.models import AuditModule
from apps.audit.services import log_audit_event
from apps.inventory.models import Ingredient, RecipeIngredient, StockItem, StockMovement
from apps.inventory.serializers import (
    IngredientSerializer,
    RecipeIngredientSerializer,
    StockMovementSerializer,
    StockReceiptSerializer,
)


class IngredientViewSet(AuditedModelViewSetMixin, viewsets.ModelViewSet):
    queryset = Ingredient.objects.select_related('stock').all()
    serializer_class = IngredientSerializer
    audit_module = AuditModule.INVENTORY
    audit_name = 'INGREDIENT'
    audit_fields = ('id', 'sku', 'name', 'unit', 'is_active')

    def get_permissions(self):
        permission_class = IsInventoryStaff if self.action in [
            'list', 'retrieve'] else IsGeneralManager
        return [permission_class()]

    @transaction.atomic
    def perform_create(self, serializer):
        ingredient = serializer.save()
        StockItem.objects.create(ingredient=ingredient)
        log_audit_event(
            module=AuditModule.INVENTORY,
            action='INGREDIENT_CREATED',
            details=f'Inventory ingredient {ingredient.sku} created.',
            request=self.request,
            after_state={
                'id': str(ingredient.pk), 'sku': ingredient.sku, 'unit': ingredient.unit},
        )


class RecipeIngredientViewSet(AuditedModelViewSetMixin, viewsets.ModelViewSet):
    queryset = RecipeIngredient.objects.select_related(
        'menu_item', 'ingredient').all()
    serializer_class = RecipeIngredientSerializer
    permission_classes = [IsRecipeManager]
    audit_module = AuditModule.INVENTORY
    audit_name = 'RECIPE_INGREDIENT'
    audit_fields = ('id', 'menu_item_id', 'ingredient_id', 'quantity')


class StockMovementViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = StockMovement.objects.select_related(
        'ingredient', 'created_by').all()
    serializer_class = StockMovementSerializer
    permission_classes = [IsInventoryStaff]

    @action(detail=False, methods=['post'], url_path='receive/(?P<ingredient_id>[^/.]+)')
    @transaction.atomic
    def receive(self, request, ingredient_id=None):
        serializer = StockReceiptSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        ingredient = get_object_or_404(
            Ingredient.objects.select_for_update(), pk=ingredient_id, is_active=True)
        stock, _ = StockItem.objects.select_for_update().get_or_create(ingredient=ingredient)
        quantity = serializer.validated_data['quantity']
        stock.quantity_on_hand += quantity
        stock.save(update_fields=['quantity_on_hand', 'updated_at'])
        movement = StockMovement.objects.create(
            ingredient=ingredient,
            movement_type='RECEIPT',
            quantity_delta=quantity,
            quantity_after=stock.quantity_on_hand,
            notes=serializer.validated_data.get('notes', ''),
            created_by=request.user,
        )
        log_audit_event(
            module=AuditModule.INVENTORY,
            action='INVENTORY_STOCK_RECEIVED',
            details=f'Received {quantity} {ingredient.unit} of {ingredient.name}.',
            request=request,
            after_state={'ingredient_id': str(ingredient.pk), 'quantity': str(
                quantity), 'quantity_after': str(stock.quantity_on_hand)},
        )
        return Response(StockMovementSerializer(movement).data, status=status.HTTP_201_CREATED)
