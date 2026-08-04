from __future__ import annotations

from pathlib import Path
from urllib.parse import urlparse

from django.db import transaction
from rest_framework import serializers

from artists.models import ArtistApplication, ArtistProfile, ArtistSampleWork
from artists.signals import artist_application_submitted

ALLOWED_SAMPLE_EXTENSIONS = {
    ".flac",
    ".jpeg",
    ".jpg",
    ".m4a",
    ".mov",
    ".mp3",
    ".mp4",
    ".ogg",
    ".pdf",
    ".png",
    ".wav",
    ".webm",
    ".webp",
}
MAX_SAMPLE_FILE_SIZE = 50 * 1024 * 1024


class MultiValueListField(serializers.ListField):
    def get_value(self, dictionary):
        if hasattr(dictionary, "getlist"):
            values = dictionary.getlist(self.field_name)
            if values:
                return values
        return super().get_value(dictionary)


class ArtistSampleWorkSerializer(serializers.ModelSerializer):
    fileUrl = serializers.SerializerMethodField()
    externalUrl = serializers.URLField(source="external_url", allow_blank=True)
    uploadedAt = serializers.DateTimeField(source="created_at", read_only=True)
    kind = serializers.SerializerMethodField()

    class Meta:
        model = ArtistSampleWork
        fields = [
            "id",
            "title",
            "kind",
            "fileUrl",
            "externalUrl",
            "uploadedAt",
        ]

    def get_fileUrl(self, obj: ArtistSampleWork) -> str | None:
        if not obj.file:
            return None
        request = self.context.get("request")
        if request is None:
            return obj.file.url
        return request.build_absolute_uri(obj.file.url)

    def get_kind(self, obj: ArtistSampleWork) -> str:
        return "file" if obj.file else "link"


class ArtistApplicationSerializer(serializers.ModelSerializer):
    applicantId = serializers.SerializerMethodField()
    email = serializers.EmailField(source="applicant.email", read_only=True)
    stageName = serializers.CharField(source="stage_name")
    portfolioDescription = serializers.CharField(
        source="portfolio_description",
        allow_blank=True,
        required=False,
    )
    submittedAt = serializers.DateTimeField(source="created_at", read_only=True)
    reviewedByUserId = serializers.SerializerMethodField()
    reviewedAt = serializers.DateTimeField(source="reviewed_at", read_only=True)
    reviewNote = serializers.CharField(source="review_note", read_only=True)
    samples = ArtistSampleWorkSerializer(many=True, read_only=True)

    def get_applicantId(self, obj: ArtistApplication) -> str:
        return str(obj.applicant_id)

    def get_reviewedByUserId(self, obj: ArtistApplication) -> str | None:
        if obj.reviewed_by_id is None:
            return None
        return str(obj.reviewed_by_id)

    class Meta:
        model = ArtistApplication
        fields = [
            "id",
            "applicantId",
            "email",
            "stageName",
            "portfolioDescription",
            "status",
            "submittedAt",
            "reviewedByUserId",
            "reviewedAt",
            "reviewNote",
            "samples",
        ]
        read_only_fields = ["id", "status"]


class ArtistApplicationCreateSerializer(serializers.ModelSerializer):
    stageName = serializers.CharField(source="stage_name", max_length=120)
    portfolioDescription = serializers.CharField(
        source="portfolio_description",
        allow_blank=True,
        required=False,
    )
    sampleFiles = MultiValueListField(
        child=serializers.FileField(),
        write_only=True,
        required=False,
        allow_empty=False,
    )
    sampleLinks = MultiValueListField(
        child=serializers.URLField(max_length=500),
        write_only=True,
        required=False,
        allow_empty=False,
    )

    class Meta:
        model = ArtistApplication
        fields = [
            "stageName",
            "portfolioDescription",
            "sampleFiles",
            "sampleLinks",
        ]

    def validate_sampleFiles(self, files):
        for sample_file in files:
            suffix = Path(sample_file.name).suffix.lower()
            if suffix not in ALLOWED_SAMPLE_EXTENSIONS:
                raise serializers.ValidationError(
                    f"Unsupported sample file type: {suffix or 'unknown'}."
                )
            if sample_file.size > MAX_SAMPLE_FILE_SIZE:
                raise serializers.ValidationError(
                    "Each sample file must be 50 MB or smaller."
                )
        return files

    def validate(self, attrs):
        request = self.context["request"]
        sample_files = attrs.get("sampleFiles", [])
        sample_links = attrs.get("sampleLinks", [])

        if not sample_files and not sample_links:
            raise serializers.ValidationError(
                {"samples": "At least one portfolio sample file or link is required."}
            )

        if ArtistProfile.objects.filter(user=request.user, is_approved=True).exists():
            raise serializers.ValidationError(
                {"application": "This account is already an approved artist."}
            )

        if ArtistApplication.objects.filter(
            applicant=request.user,
            status="pending",
        ).exists():
            raise serializers.ValidationError(
                {"application": "This account already has a pending artist application."}
            )

        return attrs

    @transaction.atomic
    def create(self, validated_data):
        request = self.context["request"]
        sample_files = validated_data.pop("sampleFiles", [])
        sample_links = validated_data.pop("sampleLinks", [])
        application = ArtistApplication.objects.create(
            applicant=request.user,
            **validated_data,
        )

        for sample_file in sample_files:
            ArtistSampleWork.objects.create(
                application=application,
                title=Path(sample_file.name).stem[:180] or "Uploaded sample",
                file=sample_file,
            )

        for sample_url in sample_links:
            parsed_url = urlparse(sample_url)
            title = Path(parsed_url.path).name or parsed_url.netloc or "Portfolio link"
            ArtistSampleWork.objects.create(
                application=application,
                title=title[:180],
                external_url=sample_url,
            )

        transaction.on_commit(
            lambda: artist_application_submitted.send(
                sender=ArtistApplication,
                application_id=application.pk,
                applicant_id=application.applicant_id,
                stage_name=application.stage_name,
            )
        )
        return application

    def to_representation(self, instance):
        return ArtistApplicationSerializer(instance, context=self.context).data


class ArtistApplicationReviewSerializer(serializers.Serializer):
    decision = serializers.ChoiceField(choices=["approved", "rejected"])
    reviewNote = serializers.CharField(
        source="review_note",
        allow_blank=True,
        required=False,
        default="",
    )

    def validate(self, attrs):
        if attrs["decision"] == "rejected" and not attrs.get("review_note", "").strip():
            raise serializers.ValidationError(
                {"reviewNote": "A clear rejection reason is required."}
            )
        return attrs


class ArtistProfileSerializer(serializers.ModelSerializer):
    userId = serializers.SerializerMethodField()
    stageName = serializers.CharField(source="stage_name", read_only=True)
    genreTags = serializers.ListField(source="genre_tags", read_only=True)
    profileImageUrl = serializers.SerializerMethodField()
    bannerImageUrl = serializers.SerializerMethodField()
    approvalStatus = serializers.SerializerMethodField()
    followerCount = serializers.SerializerMethodField()
    monthlyListeners = serializers.SerializerMethodField()
    trackCount = serializers.SerializerMethodField()
    albumCount = serializers.SerializerMethodField()

    class Meta:
        model = ArtistProfile
        fields = [
            "id",
            "userId",
            "stageName",
            "bio",
            "genreTags",
            "profileImageUrl",
            "bannerImageUrl",
            "approvalStatus",
            "verifiedAt",
            "followerCount",
            "monthlyListeners",
            "trackCount",
            "albumCount",
        ]

    verifiedAt = serializers.DateTimeField(source="verified_at", read_only=True)

    def get_userId(self, obj: ArtistProfile) -> str:
        return str(obj.user_id)

    def _absolute_url(self, file_field) -> str | None:
        if not file_field:
            return None
        request = self.context.get("request")
        return request.build_absolute_uri(file_field.url) if request else file_field.url

    def get_profileImageUrl(self, obj: ArtistProfile) -> str | None:
        return self._absolute_url(obj.profile_image)

    def get_bannerImageUrl(self, obj: ArtistProfile) -> str | None:
        return self._absolute_url(obj.banner_image)

    def get_approvalStatus(self, obj: ArtistProfile) -> str:
        return "approved" if obj.is_approved else "pending"

    def get_followerCount(self, obj: ArtistProfile) -> int:
        from accounts.models import UserFollow

        return UserFollow.objects.filter(following_id=obj.user_id).count()

    def get_monthlyListeners(self, obj: ArtistProfile) -> int | None:
        request = self.context.get("request")
        if request is None or not request.user.is_authenticated:
            return None

        from datetime import timedelta

        from django.utils import timezone
        from music.models import StreamEvent
        from operations.models import SubscriptionTier
        from subscriptions.services import get_current_subscription_tier

        current_profile = getattr(request.user, "artist_profile", None)
        may_view = (
            request.user.is_superuser
            or (current_profile and current_profile.pk == obj.pk)
            or get_current_subscription_tier(request.user) == SubscriptionTier.GOLD
        )
        if not may_view:
            return None

        period_start = timezone.localdate() - timedelta(days=29)
        return (
            StreamEvent.objects.filter(
                track__artist=obj,
                counted=True,
                streamed_on__gte=period_start,
            )
            .values("listener_id")
            .distinct()
            .count()
        )

    def get_trackCount(self, obj: ArtistProfile) -> int:
        return obj.tracks.filter(status="published").count()

    def get_albumCount(self, obj: ArtistProfile) -> int:
        return obj.albums.filter(status="published").count()
