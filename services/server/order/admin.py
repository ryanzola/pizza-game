from django.contrib import admin
from .models import Town, Street, Address, Order

admin.site.register(Town)
admin.site.register(Street)
admin.site.register(Address)

class OrderAdmin(admin.ModelAdmin):
    list_display = ('id', 'status', 'user', 'date_placed', 'date_delivered', 'address', 'total_cost', 'tip')
    search_fields = ('status', 'user__username', 'address__street__name', 'address__town__name')
    list_filter = ('status', 'date_placed', 'date_delivered')
    date_hierarchy = 'date_placed'

admin.site.register(Order, OrderAdmin)