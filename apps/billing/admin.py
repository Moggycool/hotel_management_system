from django.contrib import admin
from .models import Folio, FolioItem, Payment


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
