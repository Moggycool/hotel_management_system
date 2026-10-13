from django.contrib import admin

from apps.restaurant.models import RestaurantMenuItem, RestaurantOrder, RestaurantOrderItem


@admin.register(RestaurantMenuItem)
class RestaurantMenuItemAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'category',
                    'price', 'station', 'is_available')
    list_filter = ('category', 'station', 'is_available',
                   'is_fasting', 'is_vegetarian')
    search_fields = ('code', 'client_id', 'name', 'name_amharic')
    list_editable = ('price', 'is_available')


class RestaurantOrderItemInline(admin.TabularInline):
    model = RestaurantOrderItem
    extra = 0
    readonly_fields = ('id', 'status')


@admin.register(RestaurantOrder)
class RestaurantOrderAdmin(admin.ModelAdmin):
    list_display = ('order_number', 'order_type', 'outlet',
                    'status', 'grand_total', 'created_at')
    list_filter = ('status', 'order_type', 'outlet', 'created_at')
    search_fields = ('order_number', 'kot_number',
                     'table_number', 'room_number')
    readonly_fields = ('id', 'order_number', 'kot_number',
                       'created_at', 'kot_sent_at', 'settled_at')
    inlines = [RestaurantOrderItemInline]
