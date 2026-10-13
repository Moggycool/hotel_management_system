from django.contrib import admin
from .models import CashierShift, Folio, FolioItem, Payment


class FolioItemInline(admin.TabularInline):
    model = FolioItem
    extra = 1


class PaymentInline(admin.TabularInline):
    model = Payment
    extra = 0


@admin.register(Folio)
class FolioAdmin(admin.ModelAdmin):
    list_display = ('id', 'reservation', 'guest',
                    'balance_due_display', 'is_closed', 'created_at')
    list_filter = ('is_closed', 'created_at')
    search_fields = ('guest__first_name', 'guest__last_name',
                     'reservation__confirmation_code')
    inlines = [FolioItemInline, PaymentInline]

    def balance_due_display(self, obj):
        return f"{obj.balance_due:,.2f} ETB"
    balance_due_display.short_description = "Balance Due"


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ('out_trade_no', 'folio', 'method', 'amount_display',
                    'status', 'telebirr_transaction_id', 'created_at')
    list_filter = ('method', 'status', 'created_at')
    search_fields = ('out_trade_no', 'telebirr_transaction_id')

    def amount_display(self, obj):
        return f"{obj.amount:,.2f} ETB"
    amount_display.short_description = "Amount"


@admin.register(CashierShift)
class CashierShiftAdmin(admin.ModelAdmin):
    list_display = (
        'business_date', 'shift_name', 'cashier_name', 'status',
        'opening_float', 'cash_collected', 'actual_closing_cash',
        'discrepancy', 'opened_at', 'closed_at',
    )
    list_filter = ('business_date', 'shift_name', 'status')
    search_fields = ('cashier_name', 'cashier__email', 'handover_notes')
    readonly_fields = (
        'business_date', 'shift_name', 'cashier', 'cashier_name',
        'cashier_role', 'opening_float', 'cash_collected',
        'telebirr_collected', 'cbe_card_collected',
        'bank_transfer_collected', 'actual_closing_cash', 'discrepancy',
        'status', 'opened_at', 'closed_at', 'closed_by', 'handover_notes',
    )

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
