from django.contrib.auth import get_user_model
from django.db.models.signals import post_save
from django.dispatch import receiver

from accounts.models import UserPreference, UserProfile

User = get_user_model()


@receiver(post_save, sender=User)
def create_user_related_models(sender, instance, created, **kwargs) -> None:
    if not created:
        return
    display_name = (instance.get_full_name() or instance.get_username()).strip()
    UserProfile.objects.get_or_create(
        user=instance,
        defaults={"display_name": display_name},
    )
    UserPreference.objects.get_or_create(user=instance)
