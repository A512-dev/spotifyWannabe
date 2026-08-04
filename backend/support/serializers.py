from __future__ import annotations

from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework import serializers

from support.models import Ticket, TicketMessage, TicketPriority, TicketStatus
from support.services import create_ticket, is_support_user

User = get_user_model()


def display_user_name(user) -> str:
    full_name = user.get_full_name().strip()
    return full_name or user.username or user.email


class TicketMessageSerializer(serializers.ModelSerializer):
    ticketId = serializers.SerializerMethodField()
    senderId = serializers.SerializerMethodField()
    senderName = serializers.SerializerMethodField()
    isInternalNote = serializers.BooleanField(source="is_internal_note", read_only=True)
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)

    class Meta:
        model = TicketMessage
        fields = [
            "id",
            "ticketId",
            "senderId",
            "senderName",
            "body",
            "isInternalNote",
            "createdAt",
        ]
        read_only_fields = fields

    def get_ticketId(self, obj: TicketMessage) -> str:
        return str(obj.ticket_id)

    def get_senderId(self, obj: TicketMessage) -> str:
        return str(obj.sender_id)

    def get_senderName(self, obj: TicketMessage) -> str:
        return display_user_name(obj.sender)


class TicketSerializer(serializers.ModelSerializer):
    requesterId = serializers.SerializerMethodField()
    requesterName = serializers.SerializerMethodField()
    requesterEmail = serializers.EmailField(source="requester.email", read_only=True)
    assignedSupportUserId = serializers.SerializerMethodField()
    assignedSupportName = serializers.SerializerMethodField()
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    updatedAt = serializers.DateTimeField(source="updated_at", read_only=True)
    closedAt = serializers.DateTimeField(source="closed_at", read_only=True)
    messageCount = serializers.SerializerMethodField()

    class Meta:
        model = Ticket
        fields = [
            "id",
            "requesterId",
            "requesterName",
            "requesterEmail",
            "assignedSupportUserId",
            "assignedSupportName",
            "subject",
            "status",
            "priority",
            "messageCount",
            "createdAt",
            "updatedAt",
            "closedAt",
        ]
        read_only_fields = fields

    def get_requesterId(self, obj: Ticket) -> str:
        return str(obj.requester_id)

    def get_requesterName(self, obj: Ticket) -> str:
        return display_user_name(obj.requester)

    def get_assignedSupportUserId(self, obj: Ticket) -> str | None:
        return str(obj.assigned_to_id) if obj.assigned_to_id else None

    def get_assignedSupportName(self, obj: Ticket) -> str | None:
        if obj.assigned_to is None:
            return None
        return display_user_name(obj.assigned_to)

    def get_messageCount(self, obj: Ticket) -> int:
        annotated_count = getattr(obj, "message_count", None)
        if annotated_count is not None:
            return annotated_count
        return obj.messages.count()


class TicketDetailSerializer(TicketSerializer):
    messages = serializers.SerializerMethodField()

    class Meta(TicketSerializer.Meta):
        fields = [*TicketSerializer.Meta.fields, "messages"]

    def get_messages(self, obj: Ticket):
        request = self.context.get("request")
        queryset = obj.messages.select_related("sender").all()
        if request is None or not is_support_user(request.user):
            queryset = queryset.filter(is_internal_note=False)
        return TicketMessageSerializer(queryset, many=True, context=self.context).data


class TicketCreateSerializer(serializers.Serializer):
    subject = serializers.CharField(max_length=180, trim_whitespace=True)
    message = serializers.CharField(trim_whitespace=True)
    priority = serializers.ChoiceField(
        choices=TicketPriority.choices,
        default=TicketPriority.MEDIUM,
    )

    def validate_subject(self, value: str) -> str:
        value = value.strip()
        if len(value) < 4:
            raise serializers.ValidationError("Subject must contain at least 4 characters.")
        return value

    def validate_message(self, value: str) -> str:
        value = value.strip()
        if not value:
            raise serializers.ValidationError("An initial message is required.")
        return value

    @transaction.atomic
    def create(self, validated_data):
        return create_ticket(
            requester=self.context["request"].user,
            subject=validated_data["subject"],
            priority=validated_data["priority"],
            body=validated_data["message"],
        )

    def to_representation(self, instance):
        return TicketDetailSerializer(instance, context=self.context).data


class TicketMessageCreateSerializer(serializers.Serializer):
    body = serializers.CharField(trim_whitespace=True)
    isInternalNote = serializers.BooleanField(
        source="is_internal_note",
        required=False,
        default=False,
    )

    def validate_body(self, value: str) -> str:
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Message body cannot be empty.")
        return value


class TicketStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=TicketStatus.choices)


class TicketAssignmentSerializer(serializers.Serializer):
    assignedSupportUserId = serializers.PrimaryKeyRelatedField(
        source="assigned_to",
        queryset=User.objects.all(),
        allow_null=True,
    )
