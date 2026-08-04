from django.contrib import admin

from artists.models import ArtistApplication, ArtistProfile, ArtistSampleWork


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
