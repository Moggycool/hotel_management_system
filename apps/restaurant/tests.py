from decimal import Decimal

import pytest
from rest_framework.test import APIClient

from apps.accounts.models import StaffRole, User
from apps.audit.models import AuditLog
from apps.kitchen.models import KitchenTicket
from apps.inventory.models import Ingredient, RecipeIngredient, StockItem, StockMovement
from apps.properties.models import Property
from apps.restaurant.models import RestaurantMenuItem, RestaurantOrder, RestaurantOrderItem


def add_menu_item(client_id, code, name, price, station):
    return RestaurantMenuItem.objects.create(
        client_id=client_id,
        code=code,
        name=name,
        category='TRADITIONAL',
        price=Decimal(price),
        station=station,
    )


@pytest.mark.django_db
def test_pos_order_creates_station_tickets_and_settles():
    waiter = User.objects.create_user(
        email='waiter-pos@example.et', password='StrongPassword#2026',
        full_name='POS Waiter', role=StaffRole.WAITER,
    )
    cashier = User.objects.create_user(
        email='cashier-pos@example.et', password='StrongPassword#2026',
        full_name='POS Cashier', role=StaffRole.CASHIER,
    )
    add_menu_item('menu-fish', 'TR-FISH', 'Grilled Tilapia',
                  '520.00', 'HOT_KITCHEN')
    add_menu_item('menu-spris', 'BV-SPRIS',
                  'Avocado Spris', '150.00', 'BAR_BEVERAGE')
    client = APIClient()
    client.force_authenticate(user=waiter)

    response = client.post(
        '/api/v1/restaurant/orders/',
        {
            'order_type': 'DINE_IN',
            'outlet': 'Lakefront Terrace',
            'table_number': 'T-07',
            'covers': 2,
            'send_to_kitchen': True,
            'items': [
                {'menu_item_id': 'menu-fish', 'name': 'Tampered Name', 'quantity': 2,
                 'unit_price': '1.00', 'station': 'BAR_BEVERAGE', 'notes': 'Lemon on side'},
                {'menu_item_id': 'menu-spris', 'name': 'Avocado Spris', 'quantity': 2,
                 'unit_price': '150.00', 'station': 'BAR_BEVERAGE'},
            ],
        },
        format='json',
    )

    assert response.status_code == 201, response.data
    order_id = response.data['id']
    order = RestaurantOrder.objects.get(pk=order_id)
    assert order.status == 'SENT_TO_KITCHEN'
    assert order.subtotal == Decimal('1340.00')
    assert order.service_charge == Decimal('134.00')
    assert order.vat_amount == Decimal('221.10')
    assert order.grand_total == Decimal('1695.10')
    assert order.waiter == waiter
    assert order.waiter_name == waiter.full_name
    assert RestaurantOrderItem.objects.filter(order=order).count() == 2
    catalog_line = order.items.get(menu_item_id='menu-fish')
    assert catalog_line.name == 'Grilled Tilapia'
    assert catalog_line.station == 'HOT_KITCHEN'
    assert catalog_line.unit_price == Decimal('520.00')
    assert KitchenTicket.objects.filter(order=order).count() == 2

    tickets_response = client.get('/api/v1/kitchen/tickets/')
    assert tickets_response.status_code == 200
    assert len(tickets_response.data) == 2

    for item in order.items.all():
        status_response = client.post(
            f'/api/v1/restaurant/orders/{order.id}/item-status/',
            {'item_id': str(item.id), 'status': 'READY'},
            format='json',
        )
        assert status_response.status_code == 200

    order.refresh_from_db()
    assert order.status == 'READY'

    for item in order.items.all():
        status_response = client.post(
            f'/api/v1/restaurant/orders/{order.id}/item-status/',
            {'item_id': str(item.id), 'status': 'SERVED'},
            format='json',
        )
        assert status_response.status_code == 200

    order.refresh_from_db()
    assert order.status == 'SERVED'
    assert order.kitchen_tickets.filter(status='SERVED').count() == 2

    waiter_settle_response = client.post(
        f'/api/v1/restaurant/orders/{order.id}/settle/',
        {'payment_method': 'CASH'},
        format='json',
    )
    assert waiter_settle_response.status_code == 403

    client.force_authenticate(user=cashier)
    settle_response = client.post(
        f'/api/v1/restaurant/orders/{order.id}/settle/',
        {'payment_method': 'CASH', 'payment_reference': 'DRAWER-001'},
        format='json',
    )
    assert settle_response.status_code == 200
    order.refresh_from_db()
    assert order.status == 'SETTLED'
    assert order.payment_method == 'CASH'
    assert AuditLog.objects.filter(action='RESTAURANT_ORDER_SETTLED').exists()


@pytest.mark.django_db
def test_void_requires_reason_and_voids_active_kitchen_tickets():
    manager = User.objects.create_user(
        email='fb-manager-void@example.et', password='StrongPassword#2026',
        full_name='F&B Manager', role=StaffRole.FB_MANAGER,
    )
    client = APIClient()
    client.force_authenticate(user=manager)
    add_menu_item('menu-tibs-void', 'TR-TIBS-VOID',
                  'Tibs', '480.00', 'HOT_KITCHEN')
    create_response = client.post(
        '/api/v1/restaurant/orders/',
        {
            'order_type': 'DINE_IN',
            'outlet': 'Dining Room',
            'send_to_kitchen': True,
            'items': [
                {'menu_item_id': 'menu-tibs-void', 'name': 'Tibs', 'quantity': 1,
                 'unit_price': '480.00', 'station': 'HOT_KITCHEN'},
            ],
        },
        format='json',
    )
    assert create_response.status_code == 201
    order_id = create_response.data['id']

    no_reason = client.post(
        f'/api/v1/restaurant/orders/{order_id}/void/', {}, format='json')
    assert no_reason.status_code == 400

    void_response = client.post(
        f'/api/v1/restaurant/orders/{order_id}/void/',
        {'reason': 'Guest cancelled before preparation completed'},
        format='json',
    )
    assert void_response.status_code == 200
    assert void_response.data['status'] == 'VOIDED'
    ticket = KitchenTicket.objects.get(order_id=order_id)
    assert ticket.status == 'VOIDED'


@pytest.mark.django_db
def test_kitchen_item_status_cannot_skip_preparation():
    waiter = User.objects.create_user(
        email='waiter-transition@example.et', password='StrongPassword#2026',
        full_name='Transition Waiter', role=StaffRole.WAITER,
    )
    client = APIClient()
    client.force_authenticate(user=waiter)
    add_menu_item('menu-shiro-transition', 'TR-SHIRO-TRANS',
                  'Shiro', '280.00', 'HOT_KITCHEN')
    create_response = client.post(
        '/api/v1/restaurant/orders/',
        {
            'order_type': 'DINE_IN', 'outlet': 'Dining', 'send_to_kitchen': True,
            'items': [{'menu_item_id': 'menu-shiro-transition', 'name': 'Shiro', 'quantity': 1, 'unit_price': '280.00', 'station': 'HOT_KITCHEN'}],
        },
        format='json',
    )
    order_id = create_response.data['id']
    item_id = create_response.data['items'][0]['id']

    skipped = client.post(
        f'/api/v1/restaurant/orders/{order_id}/item-status/',
        {'item_id': item_id, 'status': 'SERVED'},
        format='json',
    )
    assert skipped.status_code == 409


@pytest.mark.django_db
def test_menu_catalog_is_manager_editable_and_unavailable_items_cannot_be_ordered():
    manager = User.objects.create_user(
        email='menu-fb-manager@example.et', password='StrongPassword#2026',
        full_name='Menu Manager', role=StaffRole.FB_MANAGER,
    )
    waiter = User.objects.create_user(
        email='menu-waiter@example.et', password='StrongPassword#2026',
        full_name='Menu Waiter', role=StaffRole.WAITER,
    )
    menu_item = add_menu_item(
        'menu-menu-test', 'TEST-01', 'Test Dish', '100.00', 'HOT_KITCHEN')
    manager_client = APIClient()
    manager_client.force_authenticate(user=manager)
    unavailable_response = manager_client.patch(
        f'/api/v1/restaurant/menu-items/{menu_item.client_id}/',
        {'is_available': False},
        format='json',
    )
    assert unavailable_response.status_code == 200

    waiter_client = APIClient()
    waiter_client.force_authenticate(user=waiter)
    order_response = waiter_client.post(
        '/api/v1/restaurant/orders/',
        {
            'order_type': 'DINE_IN', 'outlet': 'Dining',
            'items': [{'menu_item_id': 'menu-menu-test', 'quantity': 1}],
        },
        format='json',
    )

    assert order_response.status_code == 400
    assert RestaurantOrder.objects.count() == 0


@pytest.mark.django_db
def test_menu_item_api_uses_stable_client_id_and_server_price():
    manager = User.objects.create_user(
        email='menu-catalog-manager@example.et', password='StrongPassword#2026',
        full_name='Menu Catalog Manager', role=StaffRole.FB_MANAGER,
    )
    waiter = User.objects.create_user(
        email='menu-catalog-waiter@example.et', password='StrongPassword#2026',
        full_name='Menu Catalog Waiter', role=StaffRole.WAITER,
    )
    menu_item = add_menu_item(
        'menu-stable-id', 'CAT-01', 'Catalog Dish', '125.00', 'HOT_KITCHEN')
    manager_client = APIClient()
    manager_client.force_authenticate(user=manager)

    list_response = manager_client.get('/api/v1/restaurant/menu-items/')
    assert list_response.status_code == 200
    assert any(item['id'] == 'menu-stable-id' and item['client_id'] == 'menu-stable-id'
               for item in list_response.data)

    patch_response = manager_client.patch(
        '/api/v1/restaurant/menu-items/menu-stable-id/',
        {'price': '140.00'},
        format='json',
    )
    assert patch_response.status_code == 200
    menu_item.refresh_from_db()
    assert menu_item.price == Decimal('140.00')

    waiter_client = APIClient()
    waiter_client.force_authenticate(user=waiter)
    order_response = waiter_client.post(
        '/api/v1/restaurant/orders/',
        {
            'order_type': 'TAKEAWAY',
            'outlet': 'Counter',
            'items': [{
                'menu_item_id': 'menu-stable-id',
                'name': 'Tampered Dish',
                'quantity': 2,
                'unit_price': '1.00',
                'station': 'BAR_BEVERAGE',
            }],
        },
        format='json',
    )
    assert order_response.status_code == 201
    order = RestaurantOrder.objects.get(pk=order_response.data['id'])
    assert order.subtotal == Decimal('280.00')
    order_item = order.items.get()
    assert order_item.name == 'Catalog Dish'
    assert order_item.unit_price == Decimal('140.00')
    assert order_item.station == 'HOT_KITCHEN'


@pytest.mark.django_db
def test_restaurant_order_requires_restaurant_role():
    housekeeper = User.objects.create_user(
        email='housekeeper-pos@example.et', password='StrongPassword#2026',
        full_name='Not Restaurant Staff', role=StaffRole.HOUSEKEEPER,
    )
    client = APIClient()
    client.force_authenticate(user=housekeeper)

    response = client.post(
        '/api/v1/restaurant/orders/',
        {'order_type': 'DINE_IN', 'outlet': 'Dining', 'items': [
            {'name': 'Tea', 'quantity': 1,
                'unit_price': '10.00', 'station': 'BAR_BEVERAGE'}
        ]},
        format='json',
    )

    assert response.status_code == 403
    assert RestaurantOrder.objects.count() == 0


@pytest.mark.django_db
def test_open_direct_sale_can_be_settled_without_kitchen_ticket():
    waiter = User.objects.create_user(
        email='waiter-direct@example.et', password='StrongPassword#2026',
        full_name='Direct Sale Waiter', role=StaffRole.WAITER,
    )
    cashier = User.objects.create_user(
        email='cashier-direct@example.et', password='StrongPassword#2026',
        full_name='Direct Sale Cashier', role=StaffRole.CASHIER,
    )
    waiter_client = APIClient()
    waiter_client.force_authenticate(user=waiter)
    add_menu_item('menu-water-direct', 'BV-WATER-DIRECT',
                  'Bottled Water', '30.00', 'BAR_BEVERAGE')
    order_response = waiter_client.post(
        '/api/v1/restaurant/orders/',
        {
            'order_type': 'TAKEAWAY',
            'outlet': 'Front Desk',
            'covers': 1,
            'send_to_kitchen': False,
            'items': [
                {'menu_item_id': 'menu-water-direct', 'name': 'Bottled Water', 'quantity': 1,
                 'unit_price': '30.00', 'station': 'BAR_BEVERAGE'},
            ],
        },
        format='json',
    )
    assert order_response.status_code == 201

    cashier_client = APIClient()
    cashier_client.force_authenticate(user=cashier)
    settle_response = cashier_client.post(
        f"/api/v1/restaurant/orders/{order_response.data['id']}/settle/",
        {'payment_method': 'CASH'},
        format='json',
    )

    assert settle_response.status_code == 200
    assert settle_response.data['status'] == 'SETTLED'


@pytest.mark.django_db
def test_settlement_consumes_recipe_stock_once():
    waiter = User.objects.create_user(
        email='recipe-waiter@example.et', password='StrongPassword#2026',
        full_name='Recipe Waiter', role=StaffRole.WAITER,
    )
    cashier = User.objects.create_user(
        email='recipe-cashier@example.et', password='StrongPassword#2026',
        full_name='Recipe Cashier', role=StaffRole.CASHIER,
    )
    menu_item = add_menu_item(
        'menu-recipe-dish', 'RC-01', 'Recipe Dish', '200.00', 'HOT_KITCHEN')
    ingredient = Ingredient.objects.create(
        sku='ING-RICE', name='Rice', unit='KG')
    stock = StockItem.objects.create(
        ingredient=ingredient, quantity_on_hand=Decimal('5.000'))
    RecipeIngredient.objects.create(
        menu_item=menu_item, ingredient=ingredient, quantity=Decimal('0.250'))

    waiter_client = APIClient()
    waiter_client.force_authenticate(user=waiter)
    order_response = waiter_client.post(
        '/api/v1/restaurant/orders/',
        {
            'order_type': 'TAKEAWAY',
            'outlet': 'Dining Counter',
            'items': [{'menu_item_id': 'menu-recipe-dish', 'quantity': 2}],
        },
        format='json',
    )
    assert order_response.status_code == 201
    order_id = order_response.data['id']

    cashier_client = APIClient()
    cashier_client.force_authenticate(user=cashier)
    first_settle = cashier_client.post(
        f'/api/v1/restaurant/orders/{order_id}/settle/',
        {'payment_method': 'CASH'},
        format='json',
    )
    assert first_settle.status_code == 200
    stock.refresh_from_db()
    assert stock.quantity_on_hand == Decimal('4.500')
    assert StockMovement.objects.filter(
        reference=first_settle.data['order_number'],
        movement_type='ORDER_CONSUMPTION',
    ).count() == 1
    movement = StockMovement.objects.get(
        reference=first_settle.data['order_number'],
        movement_type='ORDER_CONSUMPTION',
    )
    assert movement.quantity_delta == Decimal('-0.500')
    assert movement.quantity_after == Decimal('4.500')
    assert movement.created_by == cashier

    repeat_settle = cashier_client.post(
        f'/api/v1/restaurant/orders/{order_id}/settle/',
        {'payment_method': 'CASH'},
        format='json',
    )
    assert repeat_settle.status_code == 409
    stock.refresh_from_db()
    assert stock.quantity_on_hand == Decimal('4.500')
    assert StockMovement.objects.filter(
        reference=first_settle.data['order_number']).count() == 1


@pytest.mark.django_db
def test_settlement_with_insufficient_recipe_stock_rolls_back():
    waiter = User.objects.create_user(
        email='short-stock-waiter@example.et', password='StrongPassword#2026',
        full_name='Short Stock Waiter', role=StaffRole.WAITER,
    )
    cashier = User.objects.create_user(
        email='short-stock-cashier@example.et', password='StrongPassword#2026',
        full_name='Short Stock Cashier', role=StaffRole.CASHIER,
    )
    menu_item = add_menu_item(
        'menu-short-stock', 'RC-02', 'Stock Short Dish', '100.00', 'HOT_KITCHEN')
    ingredient = Ingredient.objects.create(
        sku='ING-OIL', name='Cooking Oil', unit='L')
    stock = StockItem.objects.create(
        ingredient=ingredient, quantity_on_hand=Decimal('0.100'))
    RecipeIngredient.objects.create(
        menu_item=menu_item, ingredient=ingredient, quantity=Decimal('0.200'))

    waiter_client = APIClient()
    waiter_client.force_authenticate(user=waiter)
    order_response = waiter_client.post(
        '/api/v1/restaurant/orders/',
        {
            'order_type': 'TAKEAWAY',
            'outlet': 'Dining Counter',
            'items': [{'menu_item_id': 'menu-short-stock', 'quantity': 1}],
        },
        format='json',
    )
    assert order_response.status_code == 201
    order_id = order_response.data['id']

    cashier_client = APIClient()
    cashier_client.force_authenticate(user=cashier)
    response = cashier_client.post(
        f'/api/v1/restaurant/orders/{order_id}/settle/',
        {'payment_method': 'CASH'},
        format='json',
    )

    assert response.status_code == 409
    assert 'Insufficient stock' in response.data['detail']
    stock.refresh_from_db()
    assert stock.quantity_on_hand == Decimal('0.100')
    assert StockMovement.objects.filter(
        reference=order_response.data['order_number']).count() == 0
    order = RestaurantOrder.objects.get(pk=order_id)
    assert order.status == 'OPEN'
