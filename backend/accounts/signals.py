from django.contrib.auth import get_user_model
from django.db.models.signals import post_migrate, post_save
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


@receiver(post_migrate)
def create_missing_user_related_models(sender, **kwargs) -> None:
    if sender.name != "accounts":
        return

    for user in User.objects.iterator():
        display_name = (user.get_full_name() or user.get_username()).strip()
        UserProfile.objects.get_or_create(
            user=user,
            defaults={"display_name": display_name},
        )
        UserPreference.objects.get_or_create(user=user)
