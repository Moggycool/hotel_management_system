from collections import defaultdict
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import transaction

from apps.inventory.models import RecipeIngredient, StockMovement, StockItem


@transaction.atomic
def consume_order_recipes(order, actor=None):
    required = defaultdict(lambda: Decimal('0.000'))
    ingredients = {}

    for order_item in order.items.exclude(status='CANCELLED'):
        recipe_rows = RecipeIngredient.objects.filter(
            menu_item__client_id=order_item.menu_item_id,
            menu_item__is_available=True,
            ingredient__is_active=True,
        ).select_related('ingredient')
        for recipe_row in recipe_rows:
            ingredient_id = recipe_row.ingredient_id
            required[ingredient_id] += recipe_row.quantity * \
                order_item.quantity
            ingredients[ingredient_id] = recipe_row.ingredient

    if not required:
        return []

    stocks = {
        stock.ingredient_id: stock
        for stock in StockItem.objects.select_for_update().filter(
            ingredient_id__in=required.keys()).select_related('ingredient')
    }
    missing = [
        ingredients[item_id].name for item_id in required if item_id not in stocks]
    shortages = []
    for ingredient_id, needed in required.items():
        stock = stocks.get(ingredient_id)
        if stock and stock.quantity_on_hand < needed:
            shortages.append(
                f'{stock.ingredient.name}: need {needed} {stock.ingredient.unit}, have {stock.quantity_on_hand}')
    if missing or shortages:
        messages = []
        if missing:
            messages.append(
                f'Missing stock records for: {", ".join(missing)}.')
        if shortages:
            messages.append('Insufficient stock: ' +
                            '; '.join(shortages) + '.')
        raise ValidationError(' '.join(messages))

    movements = []
    for ingredient_id, needed in required.items():
        stock = stocks[ingredient_id]
        stock.quantity_on_hand -= needed
        stock.save(update_fields=['quantity_on_hand', 'updated_at'])
        movements.append(StockMovement.objects.create(
            ingredient_id=ingredient_id,
            movement_type='ORDER_CONSUMPTION',
            quantity_delta=-needed,
            quantity_after=stock.quantity_on_hand,
            reference=order.order_number,
            notes=f'Recipe consumption for restaurant order {order.order_number}.',
            created_by=actor,
        ))
    return movements
