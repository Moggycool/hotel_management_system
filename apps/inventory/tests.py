from decimal import Decimal

import pytest
from rest_framework.test import APIClient

from apps.accounts.models import StaffRole, User
from apps.audit.models import AuditLog
from apps.inventory.models import Ingredient, StockItem, StockMovement
from apps.restaurant.models import RestaurantMenuItem


@pytest.mark.django_db
def test_storekeeper_receipt_updates_balance_and_writes_audit_movement():
    storekeeper = User.objects.create_user(
        email='storekeeper-receipt@example.et',
        password='StrongPassword#2026',
        full_name='Test Storekeeper',
        role=StaffRole.STOREKEEPER,
    )
    ingredient = Ingredient.objects.create(
        sku='ING-RECEIVE-01', name='Coffee Beans', unit='KG')
    stock = StockItem.objects.create(
        ingredient=ingredient, quantity_on_hand=Decimal('2.000'))
    client = APIClient()
    client.force_authenticate(user=storekeeper)

    response = client.post(
        f'/api/v1/inventory/movements/receive/{ingredient.id}/',
        {'quantity': '3.500', 'notes': 'Supplier delivery'},
        format='json',
    )

    assert response.status_code == 201, response.data
    stock.refresh_from_db()
    assert stock.quantity_on_hand == Decimal('5.500')
    assert response.data['movement_type'] == 'RECEIPT'
    assert response.data['quantity_delta'] == '3.500'
    assert response.data['quantity_after'] == '5.500'
    movement = StockMovement.objects.get(pk=response.data['id'])
    assert movement.created_by == storekeeper
    assert AuditLog.objects.filter(
        action='INVENTORY_STOCK_RECEIVED', actor_id=storekeeper.id).exists()


@pytest.mark.django_db
def test_waiter_cannot_receive_inventory():
    waiter = User.objects.create_user(
        email='waiter-stock-denied@example.et',
        password='StrongPassword#2026',
        full_name='Test Waiter',
        role=StaffRole.WAITER,
    )
    ingredient = Ingredient.objects.create(
        sku='ING-DENIED-01', name='Denied Flour', unit='KG')
    client = APIClient()
    client.force_authenticate(user=waiter)

    response = client.post(
        f'/api/v1/inventory/movements/receive/{ingredient.id}/',
        {'quantity': '1.000'},
        format='json',
    )

    assert response.status_code == 403
    assert not StockItem.objects.filter(ingredient=ingredient).exists()


@pytest.mark.django_db
def test_executive_chef_can_manage_recipe_but_waiter_cannot():
    chef = User.objects.create_user(
        email='chef-recipe@example.et', password='StrongPassword#2026',
        full_name='Test Chef', role=StaffRole.EXECUTIVE_CHEF,
    )
    waiter = User.objects.create_user(
        email='waiter-recipe@example.et', password='StrongPassword#2026',
        full_name='Recipe Waiter', role=StaffRole.WAITER,
    )
    ingredient = Ingredient.objects.create(
        sku='ING-RECIPE-01', name='Recipe Flour', unit='KG')
    menu_item = RestaurantMenuItem.objects.create(
        client_id='menu-recipe-permission', code='RP-01', name='Recipe Test',
        category='TRADITIONAL', price=Decimal('100.00'), station='HOT_KITCHEN')
    recipe_payload = {
        'menu_item': menu_item.client_id,
        'ingredient': str(ingredient.id),
        'quantity': '0.125',
    }

    chef_client = APIClient()
    chef_client.force_authenticate(user=chef)
    allowed = chef_client.post(
        '/api/v1/inventory/recipes/', recipe_payload, format='json')
    assert allowed.status_code == 201

    waiter_client = APIClient()
    waiter_client.force_authenticate(user=waiter)
    denied = waiter_client.post(
        '/api/v1/inventory/recipes/', recipe_payload, format='json')
    assert denied.status_code == 403
