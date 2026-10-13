from django.contrib import admin

from apps.inventory.models import Ingredient, RecipeIngredient, StockItem, StockMovement


class StockItemInline(admin.StackedInline):
    model = StockItem
    extra = 0


@admin.register(Ingredient)
class IngredientAdmin(admin.ModelAdmin):
    list_display = ('sku', 'name', 'unit', 'is_active')
    list_filter = ('unit', 'is_active')
    search_fields = ('sku', 'name')
    inlines = [StockItemInline]


@admin.register(RecipeIngredient)
class RecipeIngredientAdmin(admin.ModelAdmin):
    list_display = ('menu_item', 'ingredient', 'quantity')
    list_filter = ('ingredient__unit',)
    search_fields = ('menu_item__name', 'ingredient__name')


@admin.register(StockMovement)
class StockMovementAdmin(admin.ModelAdmin):
    list_display = ('ingredient', 'movement_type', 'quantity_delta',
                    'quantity_after', 'reference', 'created_at')
    list_filter = ('movement_type', 'created_at')
    search_fields = ('ingredient__name', 'reference', 'notes')
    readonly_fields = ('id', 'ingredient', 'movement_type', 'quantity_delta',
                       'quantity_after', 'reference', 'notes', 'created_by', 'created_at')

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
