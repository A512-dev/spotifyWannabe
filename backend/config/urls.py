from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("common.urls")),
    path("api/accounts/", include("accounts.urls")),
    path("api/artists/", include("artists.urls")),
    path("api/support/", include("support.urls")),
    path("api/operations/", include("operations.urls")),
    path("api/subscriptions/", include("subscriptions.urls")),
    path("api/notifications/", include("notifications.urls")),
    path("api/music/", include("music.urls")),
    path("api/playlists/", include("playlists.urls")),
    path("api/reports/", include("reports.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
