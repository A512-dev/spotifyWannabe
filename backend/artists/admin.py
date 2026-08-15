from django.contrib import admin
from django.utils import timezone

from artists.models import ArtistApplication, ArtistApplicationStatus, ArtistProfile, ArtistSampleWork
from artists.services import review_artist_application


class ArtistSampleWorkInline(admin.TabularInline):
    model = ArtistSampleWork
    extra = 0
    readonly_fields = ["created_at", "updated_at"]


@admin.register(ArtistApplication)
class ArtistApplicationAdmin(admin.ModelAdmin):
    list_display = [
        "stage_name",
        "applicant",
        "status",
        "created_at",
        "reviewed_by",
        "reviewed_at",
    ]
    list_filter = ["status", "created_at", "reviewed_at"]
    search_fields = ["stage_name", "applicant__username", "applicant__email"]
    readonly_fields = ["created_at", "updated_at", "reviewed_at"]
    inlines = [ArtistSampleWorkInline]
    actions = ["approve_applications", "reject_applications"]

    @admin.action(description="تایید درخواست‌های انتخاب‌شده (Approve)")
    def approve_applications(self, request, queryset):
        for app in queryset.filter(status=ArtistApplicationStatus.PENDING):
            review_artist_application(
                application=app,
                reviewer=request.user,
                decision=ArtistApplicationStatus.APPROVED,
                review_note="Approved via Django Admin",
            )

    @admin.action(description="رد درخواست‌های انتخاب‌شده (Reject)")
    def reject_applications(self, request, queryset):
        for app in queryset.filter(status=ArtistApplicationStatus.PENDING):
            review_artist_application(
                application=app,
                reviewer=request.user,
                decision=ArtistApplicationStatus.REJECTED,
                review_note="Rejected via Django Admin",
            )

    def save_model(self, request, obj, form, change):
        if change and "status" in form.changed_data:
            review_artist_application(
                application=obj,
                reviewer=request.user,
                decision=obj.status,
                review_note=obj.review_note or "Reviewed via Admin form",
            )
        else:
            super().save_model(request, obj, form, change)


@admin.register(ArtistProfile)
class ArtistProfileAdmin(admin.ModelAdmin):
    list_display = ["stage_name", "user", "is_approved", "verified_at"]
    list_filter = ["is_approved", "verified_at"]
    search_fields = ["stage_name", "user__username", "user__email"]
    readonly_fields = ["created_at", "updated_at"]


@admin.register(ArtistSampleWork)
class ArtistSampleWorkAdmin(admin.ModelAdmin):
    list_display = ["title", "application", "created_at"]
    search_fields = ["title", "application__stage_name"]
    readonly_fields = ["created_at", "updated_at"]