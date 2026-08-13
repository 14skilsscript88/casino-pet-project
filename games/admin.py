from django.contrib import admin

from .models import Case, CaseItem, PromoCode, PromoCodeActivation


class CaseItemInline(admin.TabularInline):
    model = CaseItem
    extra = 1 


@admin.register(Case)
class CaseAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'price', 'is_active', 'order')
    prepopulated_fields = {'slug': ('name',)} 
    search_fields = ('name', 'slug')
    inlines = [CaseItemInline]


@admin.register(PromoCode)
class PromoCodeAdmin(admin.ModelAdmin):
    list_display = ('code', 'case', 'activations_count', 'max_activations', 'is_active', 'created_at')
    list_filter = ('is_active', 'case')
    search_fields = ('code',)
    readonly_fields = ('activations_count', 'created_at')
    autocomplete_fields = ('case',)
    fields = ('code', 'case', 'max_activations', 'is_active', 'activations_count', 'created_at')


@admin.register(PromoCodeActivation)
class PromoCodeActivationAdmin(admin.ModelAdmin):
    list_display = ('promo_code', 'user', 'gift', 'created_at')
    list_filter = ('promo_code',)
    search_fields = ('user__username', 'promo_code__code')
    readonly_fields = ('promo_code', 'user', 'gift', 'created_at')

    def has_add_permission(self, request):
        return False