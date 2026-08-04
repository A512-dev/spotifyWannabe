from __future__ import annotations

from django.db.models import Count
from rest_framework import filters, mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from common.permissions import IsSupportOrAdministrator
from support.models import Ticket, TicketPriority, TicketStatus
from support.serializers import (
    TicketAssignmentSerializer,
    TicketCreateSerializer,
    TicketDetailSerializer,
    TicketMessageCreateSerializer,
    TicketMessageSerializer,
    TicketSerializer,
    TicketStatusSerializer,
)
from support.services import (
    add_ticket_message,
    assign_ticket,
    change_ticket_status,
    is_support_user,
)


class TicketViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["subject", "requester__username", "requester__email"]
    ordering_fields = ["created_at", "updated_at", "priority", "status"]
    ordering = ["-updated_at"]

    def get_queryset(self):
        queryset = (
            Ticket.objects.select_related("requester", "assigned_to")
            .annotate(message_count=Count("messages"))
        )
        user = self.request.user
        if not is_support_user(user):
            queryset = queryset.filter(requester=user)

        status_value = self.request.query_params.get("status")
        if status_value in TicketStatus.values:
            queryset = queryset.filter(status=status_value)

        priority_value = self.request.query_params.get("priority")
        if priority_value in TicketPriority.values:
            queryset = queryset.filter(priority=priority_value)

        assigned_value = self.request.query_params.get("assigned")
        if is_support_user(user) and assigned_value:
            if assigned_value == "me":
                queryset = queryset.filter(assigned_to=user)
            elif assigned_value == "unassigned":
                queryset = queryset.filter(assigned_to__isnull=True)

        return queryset

    def get_serializer_class(self):
        if self.action == "create":
            return TicketCreateSerializer
        if self.action == "retrieve":
            return TicketDetailSerializer
        if self.action == "messages":
            return TicketMessageCreateSerializer
        if self.action == "change_status":
            return TicketStatusSerializer
        if self.action == "assignment":
            return TicketAssignmentSerializer
        return TicketSerializer

    def get_permissions(self):
        if self.action in {"change_status", "assignment"}:
            return [IsSupportOrAdministrator()]
        return [IsAuthenticated()]

    @action(detail=True, methods=["post"], url_path="messages")
    def messages(self, request, pk=None):
        ticket = self.get_object()
        input_serializer = self.get_serializer(data=request.data)
        input_serializer.is_valid(raise_exception=True)
        message = add_ticket_message(
            ticket=ticket,
            sender=request.user,
            body=input_serializer.validated_data["body"],
            is_internal_note=input_serializer.validated_data["is_internal_note"],
        )
        output_serializer = TicketMessageSerializer(
            message,
            context=self.get_serializer_context(),
        )
        return Response(output_serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["patch"], url_path="status")
    def change_status(self, request, pk=None):
        ticket = self.get_object()
        input_serializer = self.get_serializer(data=request.data)
        input_serializer.is_valid(raise_exception=True)
        updated_ticket = change_ticket_status(
            ticket=ticket,
            actor=request.user,
            new_status=input_serializer.validated_data["status"],
        )
        output_serializer = TicketDetailSerializer(
            updated_ticket,
            context=self.get_serializer_context(),
        )
        return Response(output_serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["patch"], url_path="assignment")
    def assignment(self, request, pk=None):
        ticket = self.get_object()
        input_serializer = self.get_serializer(data=request.data)
        input_serializer.is_valid(raise_exception=True)
        updated_ticket = assign_ticket(
            ticket=ticket,
            actor=request.user,
            assignee=input_serializer.validated_data["assigned_to"],
        )
        output_serializer = TicketDetailSerializer(
            updated_ticket,
            context=self.get_serializer_context(),
        )
        return Response(output_serializer.data, status=status.HTTP_200_OK)
