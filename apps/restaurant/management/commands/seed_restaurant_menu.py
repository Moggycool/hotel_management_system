from decimal import Decimal

from django.core.management.base import BaseCommand

from apps.restaurant.models import RestaurantMenuItem


MENU_ITEMS = [
    ('menu-trad-01', 'TR-01', 'Special Lamb Shekla Tibs',
     'traditional', '480.00', 'HOT_KITCHEN', False, True, False, 18),
    ('menu-trad-02', 'TR-02', 'Arba Minch Chamo Grilled Tilapia',
     'traditional', '520.00', 'HOT_KITCHEN', True, False, False, 22),
    ('menu-trad-03', 'TR-03', 'Traditional Doro Wat Feast',
     'traditional', '580.00', 'HOT_KITCHEN', False, True, False, 15),
    ('menu-trad-04', 'TR-04', 'Kitfo Special with Kocho & Ayib',
     'traditional', '550.00', 'HOT_KITCHEN', False, True, False, 12),
    ('menu-trad-05', 'TR-05', 'Shiro Tegabino in Clay Pot',
     'fasting_vegan', '280.00', 'HOT_KITCHEN', True, True, True, 14),
    ('menu-trad-06', 'TR-06', 'Grand Yetsom Beyaynetu',
     'fasting_vegan', '360.00', 'HOT_KITCHEN', True, False, True, 10),
    ('menu-grill-01', 'GL-01', 'Nechisar Prime Beef Tenderloin',
     'grill_mains', '650.00', 'HOT_KITCHEN', False, False, False, 25),
    ('menu-grill-02', 'GL-02', 'Entoto Triple-Decker Club Sandwich',
     'grill_mains', '340.00', 'COLD_SALAD', False, False, False, 14),
    ('menu-grill-03', 'GL-03', 'Wood-Fired Margherita Basil Pizza',
     'grill_mains', '380.00', 'HOT_KITCHEN', False, False, True, 16),
    ('menu-bf-01', 'BF-01', 'Chechebsa with Spiced Butter & Honey',
     'breakfast', '240.00', 'HOT_KITCHEN', False, False, True, 10),
    ('menu-bf-02', 'BF-02', 'Special Ful Mudammas with Boiled Egg',
     'breakfast', '220.00', 'HOT_KITCHEN', False, False, True, 8),
    ('menu-bev-01', 'BV-01', 'Ceremonial Clay Jebena Buna',
     'beverages', '90.00', 'BAR_BEVERAGE', True, False, True, 8),
    ('menu-bev-02', 'BV-02', 'Arba Minch Fresh Avocado-Mango Spris',
     'beverages', '150.00', 'BAR_BEVERAGE', True, False, True, 6),
    ('menu-bev-03', 'BV-03', 'St. George Draft / Chilled Bottle',
     'beverages', '130.00', 'BAR_BEVERAGE', True, False, True, 3),
    ('menu-bev-04', 'BV-04', 'Habesha Cold Lager Beer',
     'beverages', '140.00', 'BAR_BEVERAGE', True, False, True, 3),
    ('menu-bev-05', 'BV-05', 'Traditional Royal Honey Wine (Tej)',
     'beverages', '210.00', 'BAR_BEVERAGE', True, False, True, 4),
    ('menu-des-01', 'DS-01', 'Arba Minch Banana Flambe with Vanilla Gelato',
     'desserts', '190.00', 'BAKERY_DESSERT', False, False, True, 10),
]

CATEGORY_MAP = {
    'traditional': 'TRADITIONAL',
    'grill_mains': 'GRILL_MAINS',
    'fasting_vegan': 'FASTING_VEGAN',
    'beverages': 'BEVERAGES',
    'breakfast': 'BREAKFAST',
    'desserts': 'DESSERTS',
}


class Command(BaseCommand):
    help = 'Seed or refresh the restaurant menu catalog from the standard hotel menu.'

    def handle(self, *args, **options):
        for client_id, code, name, category, price, station, fasting, spicy, vegetarian, prep_minutes in MENU_ITEMS:
            RestaurantMenuItem.objects.update_or_create(
                client_id=client_id,
                defaults={
                    'code': code,
                    'name': name,
                    'description': name,
                    'category': CATEGORY_MAP[category],
                    'price': Decimal(price),
                    'station': station,
                    'is_fasting': fasting,
                    'is_spicy': spicy,
                    'is_vegetarian': vegetarian,
                    'preparation_minutes': prep_minutes,
                    'is_available': True,
                },
            )
        self.stdout.write(self.style.SUCCESS(
            f'Seeded {len(MENU_ITEMS)} restaurant menu items.'))
