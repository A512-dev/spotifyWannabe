from __future__ import annotations

from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from rest_framework import serializers

from accounts.models import Gender, UserFollow, UserPreference, UserProfile
from accounts.services import login_user, register_artist, register_listener, validate_new_password
from common.permissions import user_in_group

User = get_user_model()


def user_role(user) -> str:
    if user.is_superuser:
        return "admin"
    if user_in_group(user, "support"):
        return "support"
    artist_profile = getattr(user, "artist_profile", None)
    if artist_profile and artist_profile.is_approved:
        return "artist"
    return "listener"


def subscription_tier_for(user) -> str:
    try:
        from subscriptions.services import get_current_subscription_tier
        return get_current_subscription_tier(user)
    except Exception:
        return "basic"


class UserSerializer(serializers.ModelSerializer):
    displayName = serializers.CharField(source="profile.display_name", read_only=True)
    role = serializers.SerializerMethodField()
    subscriptionTier = serializers.SerializerMethodField()
    birthDate = serializers.DateField(source="profile.birth_date", read_only=True)
    gender = serializers.CharField(source="profile.gender", read_only=True)
    avatarUrl = serializers.SerializerMethodField()
    artistProfileId = serializers.SerializerMethodField()
    createdAt = serializers.DateTimeField(source="date_joined", read_only=True)
    lastActiveAt = serializers.DateTimeField(source="last_login", read_only=True, allow_null=True)
    isEmailVerified = serializers.BooleanField(source="is_active", read_only=True)
    followerCount = serializers.SerializerMethodField()
    followingCount = serializers.SerializerMethodField()
    dailyStreamCount = serializers.SerializerMethodField()
    isFollowing = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id", "username", "displayName", "email", "role", "subscriptionTier",
            "birthDate", "gender", "avatarUrl", "artistProfileId", "createdAt",
            "lastActiveAt", "isEmailVerified", "followerCount", "followingCount", "dailyStreamCount", "isFollowing",
        ]

    def get_role(self, obj) -> str:
        return user_role(obj)

    def get_subscriptionTier(self, obj) -> str:
        return subscription_tier_for(obj)

    def get_avatarUrl(self, obj) -> str | None:
        profile = getattr(obj, "profile", None)
        if not profile or not profile.avatar:
            return None
        request = self.context.get("request")
        return request.build_absolute_uri(profile.avatar.url) if request else profile.avatar.url

    def get_artistProfileId(self, obj) -> str | None:
        profile = getattr(obj, "artist_profile", None)
        return str(profile.pk) if profile else None

    def get_followerCount(self, obj) -> int:
        return obj.follower_links.count()

    def get_followingCount(self, obj) -> int:
        return obj.following_links.count()

    def get_dailyStreamCount(self, obj) -> int:
        try:
            from django.utils import timezone
            return obj.stream_events.filter(counted=True, streamed_on=timezone.localdate()).count()
        except Exception:
            return 0

    def get_isFollowing(self, obj) -> bool:
        request = self.context.get("request")
        if request is None or not request.user.is_authenticated or request.user.pk == obj.pk:
            return False
        return UserFollow.objects.filter(follower=request.user, following=obj).exists()


class PublicUserSerializer(UserSerializer):
    """Deliberately excludes private account and authentication metadata."""

    class Meta(UserSerializer.Meta):
        fields = [
            "id",
            "username",
            "displayName",
            "role",
            "subscriptionTier",
            "avatarUrl",
            "artistProfileId",
            "createdAt",
            "followerCount",
            "followingCount",
            "dailyStreamCount",
            "isFollowing",
        ]


class ListenerRegistrationSerializer(serializers.Serializer):
    displayName = serializers.CharField(max_length=120)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    passwordConfirmation = serializers.CharField(write_only=True)
    birthDate = serializers.DateField()
    gender = serializers.ChoiceField(choices=Gender.choices)
    acceptsPrivacyPolicy = serializers.BooleanField()

    def validate(self, attrs):
        if attrs["password"] != attrs["passwordConfirmation"]:
            raise serializers.ValidationError({"passwordConfirmation": "Passwords do not match."})
        if not attrs["acceptsPrivacyPolicy"]:
            raise serializers.ValidationError({"acceptsPrivacyPolicy": "The privacy policy must be accepted."})
        return attrs

    def create(self, validated_data):
        return register_listener(
            display_name=validated_data["displayName"],
            email=validated_data["email"],
            password=validated_data["password"],
            birth_date=validated_data["birthDate"],
            gender=validated_data["gender"],
        )


class ArtistRegistrationSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    passwordConfirmation = serializers.CharField(write_only=True)
    stageName = serializers.CharField(max_length=120)
    portfolioDescription = serializers.CharField(required=False, allow_blank=True, default="")
    sampleFiles = serializers.ListField(child=serializers.FileField(), required=False, default=list)
    sampleLinks = serializers.ListField(child=serializers.URLField(), required=False, default=list)
    acceptsPrivacyPolicy = serializers.BooleanField()

    def validate(self, attrs):
        if attrs["password"] != attrs["passwordConfirmation"]:
            raise serializers.ValidationError({"passwordConfirmation": "Passwords do not match."})
        if not attrs["acceptsPrivacyPolicy"]:
            raise serializers.ValidationError({"acceptsPrivacyPolicy": "The privacy policy must be accepted."})
        return attrs

    def create(self, validated_data):
        return register_artist(
            stage_name=validated_data["stageName"],
            email=validated_data["email"],
            password=validated_data["password"],
            portfolio_description=validated_data.get("portfolioDescription", ""),
            sample_files=validated_data.get("sampleFiles", []),
            sample_links=validated_data.get("sampleLinks", []),
        )


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def create(self, validated_data):
        return login_user(email=validated_data["email"], password=validated_data["password"])


class ProfileUpdateSerializer(serializers.ModelSerializer):
    displayName = serializers.CharField(source="display_name", required=False, max_length=120)
    birthDate = serializers.DateField(source="birth_date", required=False, allow_null=True)
    avatarFile = serializers.ImageField(source="avatar", required=False, allow_null=True)

    class Meta:
        model = UserProfile
        fields = ["displayName", "birthDate", "gender", "avatarFile"]

    def validate_avatarFile(self, value):
        request = self.context.get("request")
        if value and request is not None:
            from operations.models import SubscriptionTier
            from subscriptions.services import get_current_subscription_tier

            if get_current_subscription_tier(request.user) == SubscriptionTier.BASIC:
                raise serializers.ValidationError(
                    "Profile image uploads require a Silver or Gold subscription."
                )
        return value


class PreferenceSerializer(serializers.ModelSerializer):
    systemSoundEnabled = serializers.BooleanField(source="system_sound_enabled")
    notificationsEnabled = serializers.BooleanField(source="notifications_enabled")
    subscriptionNotifications = serializers.BooleanField(source="subscription_notifications")
    followedArtistNotifications = serializers.BooleanField(source="followed_artist_notifications")
    supportNotifications = serializers.BooleanField(source="support_notifications")

    class Meta:
        model = UserPreference
        fields = [
            "language", "systemSoundEnabled", "notificationsEnabled",
            "subscriptionNotifications", "followedArtistNotifications", "supportNotifications",
        ]


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def save(self):
        email = self.validated_data["email"].strip().lower()
        user = User.objects.filter(email__iexact=email, is_active=True).first()
        if user:
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            send_mail(
                subject="SoundWave password reset",
                message=f"Use uid={uid} and token={token} to reset your password.",
                from_email=None,
                recipient_list=[user.email],
                fail_silently=True,
            )
        return None


class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    newPassword = serializers.CharField(write_only=True)
    newPasswordConfirmation = serializers.CharField(write_only=True)

    def validate(self, attrs):
        if attrs["newPassword"] != attrs["newPasswordConfirmation"]:
            raise serializers.ValidationError({"newPasswordConfirmation": "Passwords do not match."})
        try:
            user_id = urlsafe_base64_decode(attrs["uid"]).decode()
            user = User.objects.get(pk=user_id, is_active=True)
        except (ValueError, TypeError, OverflowError, User.DoesNotExist):
            raise serializers.ValidationError({"uid": "Invalid reset link."})
        if not default_token_generator.check_token(user, attrs["token"]):
            raise serializers.ValidationError({"token": "Invalid or expired reset token."})
        validate_new_password(attrs["newPassword"], user=user)
        attrs["user"] = user
        return attrs

    def save(self):
        user = self.validated_data["user"]
        user.set_password(self.validated_data["newPassword"])
        user.save(update_fields=["password"])
        user.auth_token.delete() if hasattr(user, "auth_token") else None
        return user


class FollowStateSerializer(serializers.Serializer):
    isFollowing = serializers.BooleanField(read_only=True)
    followerCount = serializers.IntegerField(read_only=True)
