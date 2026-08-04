from django.contrib import admin

from operations.models import SubscriptionPlan, SubscriptionPriceChange


@admin.register(SubscriptionPlan)
class SubscriptionPlanAdmin(admin.ModelAdmin):
    list_display = (
        "tier",
        "monthly_price_cents",
        "currency",
        "playlist_limit",
        "updated_by",
        "updated_at",
    )
    readonly_fields = (
        "tier",
        "playlist_limit",
        "can_upload_profile_image",
        "can_download_tracks",
        "has_early_access",
        "can_view_advanced_stats",
        "updated_by",
        "created_at",
        "updated_at",
    )


@admin.register(SubscriptionPriceChange)
class SubscriptionPriceChangeAdmin(admin.ModelAdmin):
    list_display = (
        "plan",
        "old_monthly_price_cents",
        "new_monthly_price_cents",
        "changed_by",
        "created_at",
    )
    list_filter = ("plan__tier",)
    readonly_fields = (
        "plan",
        "old_monthly_price_cents",
        "new_monthly_price_cents",
        "changed_by",
        "created_at",
        "updated_at",
    )
