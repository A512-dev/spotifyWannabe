from __future__ import annotations

from pathlib import Path
from urllib.parse import urlparse

from django.db import transaction
from rest_framework import serializers

from artists.models import ArtistApplication, ArtistProfile, ArtistSampleWork

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
