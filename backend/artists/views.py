from __future__ import annotations

from rest_framework import filters, mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from artists.models import ArtistApplication, ArtistApplicationStatus, ArtistProfile
from artists.serializers import (
    ArtistApplicationCreateSerializer,
    ArtistApplicationReviewSerializer,
    ArtistApplicationSerializer,
    ArtistProfileSerializer,
)
from artists.services import review_artist_application
from common.permissions import IsSupportOrAdministrator


class ArtistApplicationViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["stage_name", "applicant__email", "applicant__username"]
    ordering_fields = ["created_at", "reviewed_at", "stage_name", "status"]
    ordering = ["-created_at"]

    def get_queryset(self):
        queryset = ArtistApplication.objects.select_related(
            "applicant",
            "reviewed_by",
        ).prefetch_related("samples")
        user = self.request.user

        if not (user.is_superuser or user.groups.filter(name="support").exists()):
            queryset = queryset.filter(applicant=user)

        status_value = self.request.query_params.get("status")
        if status_value in ArtistApplicationStatus.values:
            queryset = queryset.filter(status=status_value)

        return queryset

    def get_serializer_class(self):
        if self.action == "create":
            return ArtistApplicationCreateSerializer
        if self.action == "review":
            return ArtistApplicationReviewSerializer
        return ArtistApplicationSerializer

    def get_permissions(self):
        if self.action == "review":
            return [IsSupportOrAdministrator()]
        return [IsAuthenticated()]

    @action(detail=True, methods=["post"], url_path="review")
    def review(self, request, pk=None):
        application = self.get_object()
        input_serializer = self.get_serializer(data=request.data)
        input_serializer.is_valid(raise_exception=True)
        reviewed_application = review_artist_application(
            application=application,
            reviewer=request.user,
            decision=input_serializer.validated_data["decision"],
            review_note=input_serializer.validated_data.get("review_note", ""),
        )
        output_serializer = ArtistApplicationSerializer(
            reviewed_application,
            context=self.get_serializer_context(),
        )
        return Response(output_serializer.data, status=status.HTTP_200_OK)


class ArtistProfileViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = ArtistProfileSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["stage_name", "bio", "genre_tags"]
    ordering_fields = ["stage_name", "verified_at", "created_at"]
    ordering = ["stage_name"]

    def get_queryset(self):
        return (
            ArtistProfile.objects.filter(is_approved=True)
            .select_related("user", "verified_by")
            .prefetch_related("tracks", "albums")
        )
