from django.urls import include, path
from rest_framework.routers import DefaultRouter

from accounts.views import (
    LoginView,
    LogoutView,
    MeView,
    PasswordResetConfirmView,
    PasswordResetRequestView,
    PreferenceView,
    RegisterArtistView,
    RegisterListenerView,
    UserViewSet,
)

app_name = "accounts"
router = DefaultRouter()
router.register("users", UserViewSet, basename="user")

urlpatterns = [
    path("register/listener/", RegisterListenerView.as_view(), name="register-listener"),
    path("register/artist/", RegisterArtistView.as_view(), name="register-artist"),
    path("login/", LoginView.as_view(), name="login"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("me/", MeView.as_view(), name="me"),
    path("preferences/", PreferenceView.as_view(), name="preferences"),
    path("password-reset/", PasswordResetRequestView.as_view(), name="password-reset"),
    path("password-reset/confirm/", PasswordResetConfirmView.as_view(), name="password-reset-confirm"),
    path("", include(router.urls)),
]
