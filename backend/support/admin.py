from django.contrib import admin

from support.models import Ticket, TicketMessage


class TicketMessageInline(admin.TabularInline):
    model = TicketMessage
    extra = 0
    readonly_fields = ("sender", "body", "is_internal_note", "created_at")
    can_delete = False


@admin.register(Ticket)
class TicketAdmin(admin.ModelAdmin):
    list_display = (
        "subject",
        "requester",
        "assigned_to",
        "status",
        "priority",
        "updated_at",
    )
    list_filter = ("status", "priority")
    search_fields = (
        "subject",
        "requester__username",
        "requester__email",
        "assigned_to__username",
    )
    autocomplete_fields = ("requester", "assigned_to")
    readonly_fields = ("created_at", "updated_at", "closed_at")
    inlines = (TicketMessageInline,)


@admin.register(TicketMessage)
class TicketMessageAdmin(admin.ModelAdmin):
    list_display = ("ticket", "sender", "is_internal_note", "created_at")
    list_filter = ("is_internal_note",)
    search_fields = ("ticket__subject", "sender__username", "body")
    autocomplete_fields = ("ticket", "sender")
    readonly_fields = ("created_at", "updated_at")
