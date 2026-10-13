import uuid
from decimal import Decimal

from django.conf import settings
from django.db import models
from django.utils import timezone


class Ingredient(models.Model):
    UNITS = [
        ('KG', 'Kilogram'),
        ('G', 'Gram'),
        ('L', 'Liter'),
        ('ML', 'Milliliter'),
        ('EACH', 'Each'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    sku = models.CharField(max_length=40, unique=True)
    name = models.CharField(max_length=120, unique=True)
    unit = models.CharField(max_length=10, choices=UNITS)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f'{self.name} ({self.unit})'


class StockItem(models.Model):
    ingredient = models.OneToOneField(
        Ingredient, on_delete=models.PROTECT, related_name='stock')
    quantity_on_hand = models.DecimalField(
        max_digits=14, decimal_places=3, default=Decimal('0.000'))
    reorder_level = models.DecimalField(
        max_digits=14, decimal_places=3, default=Decimal('0.000'))
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'{self.ingredient.name}: {self.quantity_on_hand} {self.ingredient.unit}'


class RecipeIngredient(models.Model):
    menu_item = models.ForeignKey(
        'restaurant.RestaurantMenuItem', on_delete=models.CASCADE, related_name='recipe_ingredients')
    ingredient = models.ForeignKey(
        Ingredient, on_delete=models.PROTECT, related_name='recipes')
    quantity = models.DecimalField(max_digits=12, decimal_places=3)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['menu_item', 'ingredient'], name='unique_menu_recipe_ingredient'),
        ]

    def __str__(self):
        return f'{self.menu_item.name}: {self.quantity} {self.ingredient.unit} {self.ingredient.name}'


class StockMovement(models.Model):
    TYPES = [
        ('RECEIPT', 'Receipt'),
        ('ORDER_CONSUMPTION', 'Order Consumption'),
        ('ADJUSTMENT', 'Adjustment'),
        ('WASTE', 'Waste'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ingredient = models.ForeignKey(
        Ingredient, on_delete=models.PROTECT, related_name='movements')
    movement_type = models.CharField(max_length=24, choices=TYPES)
    quantity_delta = models.DecimalField(max_digits=14, decimal_places=3)
    quantity_after = models.DecimalField(max_digits=14, decimal_places=3)
    reference = models.CharField(max_length=100, blank=True, db_index=True)
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='stock_movements')
    created_at = models.DateTimeField(default=timezone.now, db_index=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.ingredient.name} {self.quantity_delta} ({self.movement_type})'
