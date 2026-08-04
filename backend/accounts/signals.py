from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

from accounts.models import UserPreference, UserProfile

User = get_user_model()


@receiver(pre_save, sender=User)
def enforce_single_active_administrator(sender, instance, **kwargs) -> None:
    if not instance.is_superuser or not instance.is_active:
        return
    if User.objects.filter(is_superuser=True, is_active=True).exclude(pk=instance.pk).exists():
        raise ValidationError("SoundWave supports exactly one active system administrator.")


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
