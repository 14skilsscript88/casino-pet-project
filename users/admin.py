from django.contrib import admin

from .models import TelegramUser, Inventory, InventoryItem, LeaderboardPerMonth, Gift


admin.site.register(TelegramUser)
admin.site.register(Inventory)
admin.site.register(InventoryItem)
admin.site.register(LeaderboardPerMonth)


@admin.register(Gift)
class GiftAdmin(admin.ModelAdmin):
    list_display = ('name', 'price')
    search_fields = ('name',)