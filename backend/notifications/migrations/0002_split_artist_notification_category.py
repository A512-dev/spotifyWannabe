from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("notifications", "0001_initial")]

    operations = [
        migrations.AlterField(
            model_name="notification",
            name="type",
            field=models.CharField(
                choices=[
                    ("system", "System"),
                    ("artist", "Artist account"),
                    ("artist_release", "Followed artist release"),
                    ("billing", "Billing"),
                    ("support", "Support"),
                    ("playlist", "Playlist"),
                ],
                max_length=24,
            ),
        ),
    ]
