from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from artists.models import ArtistProfile
from music.models import Genre, Album, Track, ReleaseStatus

User = get_user_model()

SEED_DATA = [
    {
        "username": "twentyonepilots",
        "email": "twentyonepilots@example.com",
        "stage_name": "Twenty One Pilots",
        "bio": "American musical duo from Columbus, Ohio.",
        "albums": [
            {
                "title": "Scaled and Icy",
                "genre": "Alternative Pop",
                "tracks": [
                    {
                        "title": "Choker",
                        "track_number": 2,
                        "duration_seconds": 223,  # 03:43
                        "filename": "02 - Choker.mp3",
                    },
                    {
                        "title": "Never Take It",
                        "track_number": 6,
                        "duration_seconds": 212,  # 03:32
                        "filename": "06 - Never Take It.mp3",
                    },
                    {
                        "title": "Mulberry Street",
                        "track_number": 7,
                        "duration_seconds": 224,  # 03:44
                        "filename": "07 - Mulberry Street.mp3",
                    },
                ],
            },
            {
                "title": "Clancy",
                "genre": "Alternative Rock",
                "tracks": [
                    {
                        "title": "Overcompensate",
                        "track_number": 1,
                        "duration_seconds": 255,  # 04:15
                        "filename": "01. Twenty One Pilots - Overcompensate.mp3",
                    },
                    {
                        "title": "Next Semester",
                        "track_number": 2,
                        "duration_seconds": 249,  # 04:09
                        "filename": "02. Twenty One Pilots - Next Semester.mp3",
                    },
                    {
                        "title": "Backslide",
                        "track_number": 3,
                        "duration_seconds": 205,  # 03:25
                        "filename": "03. Twenty One Pilots - Backslide.mp3",
                    },
                    {
                        "title": "Midwest Indigo",
                        "track_number": 4,
                        "duration_seconds": 201,  # 03:21
                        "filename": "04. Twenty One Pilots - Midwest Indigo.mp3",
                    },
                    {
                        "title": "Paladin Strait",
                        "track_number": 13,
                        "duration_seconds": 388,  # 06:28
                        "filename": "13. Twenty One Pilots - Paladin Strait.mp3",
                    },
                ],
            },
        ],
    },
    {
        "username": "arcticmonkeys",
        "email": "arcticmonkeys@example.com",
        "stage_name": "Arctic Monkeys",
        "bio": "English rock band formed in Sheffield in 2002.",
        "albums": [
            {
                "title": "AM",
                "genre": "Indie Rock",
                "tracks": [
                    {
                        "title": "Do I Wanna Know?",
                        "track_number": 1,
                        "duration_seconds": 272,  # 04:32
                        "filename": "01 Arctic Monkeys - Do I Wanna Know.mp3",
                    },
                    {
                        "title": "Why'd You Only Call Me When You're High?",
                        "track_number": 9,
                        "duration_seconds": 161,  # 02:41
                        "filename": "09 Arctic Monkeys - Why'd You Only Call Me When You're High.mp3",
                    },
                    {
                        "title": "I Wanna Be Yours",
                        "track_number": 12,
                        "duration_seconds": 184,  # 03:04
                        "filename": "12 Arctic Monkeys - I Wanna Be Yours.mp3",
                    },
                ],
            }
        ],
    },
    {
        "username": "pinkfloyd",
        "email": "pinkfloyd@example.com",
        "stage_name": "Pink Floyd",
        "bio": "English rock band formed in London in 1965.",
        "albums": [
            {
                "title": "The Wall",
                "genre": "Progressive Rock",
                "tracks": [
                    {
                        "title": "Another Brick in the Wall",
                        "track_number": 1,
                        "duration_seconds": 241,  # 04:01
                        "filename": "Another-Brick-in-the-Wall.mp3",
                    },
                    {
                        "title": "Run Like Hell",
                        "track_number": 2,
                        "duration_seconds": 263,  # 04:23
                        "filename": "Run-Like-Hell.mp3",
                    },
                ],
            },
            {
                "title": "Wish You Were Here",
                "genre": "Progressive Rock",
                "tracks": [
                    {
                        "title": "Wish You Were Here",
                        "track_number": 1,
                        "duration_seconds": 320,  # 05:20
                        "filename": "Wish-You-Were-Here.mp3",
                    }
                ],
            },
            {
                "title": "The Division Bell",
                "genre": "Progressive Rock",
                "tracks": [
                    {
                        "title": "High Hopes",
                        "track_number": 1,
                        "duration_seconds": 514,  # 08:34
                        "filename": "High-Hopes.mp3",
                    }
                ],
            },
        ],
    },
]


class Command(BaseCommand):
    help = "Seed demo artists, albums, and tracks from the custom library"

    def handle(self, *args, **kwargs):
        today = timezone.localdate()

        for artist_data in SEED_DATA:
            # ۱. ساخت کاربر و حساب آرتیست تایید شده
            user, _ = User.objects.get_or_create(
                username=artist_data["username"],
                defaults={"email": artist_data["email"]},
            )
            if not user.has_usable_password():
                user.set_password("ArtistPass123!")
                user.save()

            artist, _ = ArtistProfile.objects.get_or_create(
                user=user,
                defaults={
                    "stage_name": artist_data["stage_name"],
                    "bio": artist_data["bio"],
                    "is_approved": True,
                },
            )
            if not artist.is_approved:
                artist.is_approved = True
                artist.save()

            # ۲. ایجاد آلبوم‌ها و ترک‌ها
            for album_data in artist_data["albums"]:
                genre, _ = Genre.objects.get_or_create(
                    name=album_data["genre"],
                    defaults={"slug": album_data["genre"].lower().replace(" ", "-")},
                )

                album, _ = Album.objects.get_or_create(
                    artist=artist,
                    title=album_data["title"],
                    defaults={
                        "genre": genre,
                        "status": ReleaseStatus.PUBLISHED,
                        "release_date": today,
                    },
                )

                for track_data in album_data["tracks"]:
                    Track.objects.get_or_create(
                        artist=artist,
                        album=album,
                        title=track_data["title"],
                        defaults={
                            "genre": genre,
                            "track_number": track_data["track_number"],
                            "duration_seconds": track_data["duration_seconds"],
                            "status": ReleaseStatus.PUBLISHED,
                            "release_date": today,
                            "audio_file": f"tracks/audio/{track_data['filename']}",
                        },
                    )

        self.stdout.write(self.style.SUCCESS("All 15 tracks, albums, and artists successfully seeded!"))