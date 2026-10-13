from decimal import Decimal

from rest_framework import serializers

from apps.inventory.models import Ingredient, RecipeIngredient, StockItem, StockMovement
from apps.restaurant.models import RestaurantMenuItem


class IngredientSerializer(serializers.ModelSerializer):
    quantity_on_hand = serializers.SerializerMethodField()
    reorder_level = serializers.SerializerMethodField()

    class Meta:
        model = Ingredient
        fields = ['id', 'sku', 'name', 'unit', 'is_active',
                  'quantity_on_hand', 'reorder_level']
        read_only_fields = ['id', 'quantity_on_hand', 'reorder_level']

    def get_quantity_on_hand(self, obj):
        return str(obj.stock.quantity_on_hand) if hasattr(obj, 'stock') else '0.000'

    def get_reorder_level(self, obj):
        return str(obj.stock.reorder_level) if hasattr(obj, 'stock') else '0.000'


class RecipeIngredientSerializer(serializers.ModelSerializer):
    menu_item = serializers.SlugRelatedField(
        slug_field='client_id', queryset=RestaurantMenuItem.objects.all())
    menu_item_name = serializers.CharField(
        source='menu_item.name', read_only=True)
    ingredient_name = serializers.CharField(
        source='ingredient.name', read_only=True)
    unit = serializers.CharField(source='ingredient.unit', read_only=True)

    class Meta:
        model = RecipeIngredient
        fields = ['id', 'menu_item', 'menu_item_name',
                  'ingredient', 'ingredient_name', 'unit', 'quantity']
        read_only_fields = ['id']


class StockMovementSerializer(serializers.ModelSerializer):
    ingredient_name = serializers.CharField(
        source='ingredient.name', read_only=True)
    unit = serializers.CharField(source='ingredient.unit', read_only=True)
    created_by_name = serializers.CharField(
        source='created_by.full_name', read_only=True)

    class Meta:
        model = StockMovement
        fields = '__all__'
        read_only_fields = ['id', 'quantity_after', 'created_by', 'created_at']


class StockReceiptSerializer(serializers.Serializer):
    quantity = serializers.DecimalField(
        max_digits=14, decimal_places=3, min_value=Decimal('0.001'))
    notes = serializers.CharField(required=False, allow_blank=True)
