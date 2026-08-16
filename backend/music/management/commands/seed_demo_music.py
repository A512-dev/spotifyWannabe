from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from artists.models import ArtistProfile
from music.models import Genre, Album, Track

User = get_user_model()

class Command(BaseCommand):
    help = "Seeds initial artists, albums, and tracks"

    def handle(self, *args, **kwargs):
        # ۱. ساخت یا دریافت آرتیست
        user, _ = User.objects.get_or_create(username="taylor_swift", email="taylor@example.com")
        artist, _ = ArtistProfile.objects.get_or_create(user=user, defaults={"stage_name": "Taylor Swift", "is_approved": True})

        # ۲. ساخت ژانر
        pop_genre, _ = Genre.objects.get_or_create(name="Pop")

        # ۳. ساخت آلبوم
        album, _ = Album.objects.get_or_create(
            artist=artist,
            title="1989",
            genre=pop_genre,
            defaults={"is_published": True}
        )

        # ۴. ساخت ترک
        Track.objects.get_or_create(
            artist=artist,
            album=album,
            title="Blank Space",
            genre=pop_genre,
            defaults={"duration_seconds": 231, "is_published": True}
        )

        self.stdout.write(self.style.SUCCESS("Successfully seeded demo music data!"))