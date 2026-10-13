from decimal import Decimal

from django.db.models import Sum

from apps.billing.models import Payment
from apps.restaurant.models import RestaurantOrder


PAYMENT_METHOD_FIELDS = {
    'CASH': 'cash_collected',
    'TELEBIRR': 'telebirr_collected',
    'CBE_BIRR': 'cbe_card_collected',
    'CARD': 'cbe_card_collected',
    'BANK_TRANSFER': 'bank_transfer_collected',
}


def get_shift_collection_totals(cashier, started_at, ended_at):
    totals = {
        'cash_collected': Decimal('0.00'),
        'telebirr_collected': Decimal('0.00'),
        'cbe_card_collected': Decimal('0.00'),
        'bank_transfer_collected': Decimal('0.00'),
    }
    if cashier is None:
        return totals

    payment_totals = Payment.objects.filter(
        received_by=cashier,
        status='COMPLETED',
        completed_at__gte=started_at,
        completed_at__lte=ended_at,
    ).values('method').annotate(total=Sum('amount'))
    for payment in payment_totals:
        field = PAYMENT_METHOD_FIELDS.get(payment['method'])
        if field:
            totals[field] += payment['total'] or Decimal('0.00')

    restaurant_totals = RestaurantOrder.objects.filter(
        settled_by=cashier,
        status='SETTLED',
        settled_at__gte=started_at,
        settled_at__lte=ended_at,
    ).values('payment_method').annotate(total=Sum('grand_total'))
    for order in restaurant_totals:
        field = PAYMENT_METHOD_FIELDS.get(order['payment_method'])
        if field:
            totals[field] += order['total'] or Decimal('0.00')
    return totals
