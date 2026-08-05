from __future__ import annotations

from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework import mixins, status, viewsets
from rest_framework.authtoken.models import Token
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import UserFollow
from accounts.serializers import (
    ArtistRegistrationSerializer,
    FollowStateSerializer,
    ListenerRegistrationSerializer,
    LoginSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    PreferenceSerializer,
    ProfileUpdateSerializer,
    PublicUserSerializer,
    UserSerializer,
)
from accounts.services import deactivate_user_account, logout_user

User = get_user_model()


class RegisterListenerView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ListenerRegistrationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        token, _ = Token.objects.get_or_create(user=user)
        return Response(
            {"token": token.key, "user": UserSerializer(user, context={"request": request}).data},
            status=status.HTTP_201_CREATED,
        )


class RegisterArtistView(APIView):
    permission_classes = [AllowAny]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def post(self, request):
        serializer = ArtistRegistrationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user, application = serializer.save()
        token, _ = Token.objects.get_or_create(user=user)
        return Response(
            {
                "token": token.key,
                "user": UserSerializer(
                    user,
                    context={"request": request},
                ).data,
                "artistApplicationId": str(application.pk),
                "applicationStatus": application.status,
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user, token = serializer.save()
        return Response({"token": token.key, "user": UserSerializer(user, context={"request": request}).data})


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        logout_user(user=request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        return Response(UserSerializer(request.user, context={"request": request}).data)

    @transaction.atomic
    def patch(self, request):
        serializer = ProfileUpdateSerializer(
            request.user.profile,
            data=request.data,
            partial=True,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(UserSerializer(request.user, context={"request": request}).data)

    def delete(self, request):
        deactivate_user_account(user=request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)


class PreferenceView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(PreferenceSerializer(request.user.preferences).data)

    def patch(self, request):
        serializer = PreferenceSerializer(request.user.preferences, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"message": "If the account exists, reset instructions were sent."})


class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"message": "Password updated successfully."})


class UserViewSet(mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    queryset = User.objects.filter(is_active=True).select_related("profile")
    serializer_class = PublicUserSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=True, methods=["post", "delete"], url_path="follow")
    def follow(self, request, pk=None):
        target = self.get_object()
        if target.pk == request.user.pk:
            return Response({"error": {"message": "You cannot follow yourself."}}, status=status.HTTP_400_BAD_REQUEST)
        if request.method == "POST":
            UserFollow.objects.get_or_create(follower=request.user, following=target)
        else:
            UserFollow.objects.filter(follower=request.user, following=target).delete()
        data = {
            "isFollowing": UserFollow.objects.filter(follower=request.user, following=target).exists(),
            "followerCount": target.follower_links.count(),
        }
        return Response(FollowStateSerializer(data).data)
