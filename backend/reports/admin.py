from django.contrib import admin

from reports.models import ArtistRevenueRecord


@admin.register(ArtistRevenueRecord)
class ArtistRevenueRecordAdmin(admin.ModelAdmin):
    list_display = (
        "artist",
        "period_start",
        "period_end",
        "stream_count",
        "unique_listener_count",
        "net_revenue_cents",
        "currency",
        "payment_status",
    )
    list_filter = ("payment_status", "currency", "period_start")
    search_fields = ("artist__stage_name", "artist__user__email")
    readonly_fields = (
        "id",
        "net_revenue_cents",
        "settled_at",
        "settled_by",
        "created_at",
        "updated_at",
    )
