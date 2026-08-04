from django.contrib import admin

from accounts.models import UserFollow, UserPreference, UserProfile

admin.site.register(UserProfile)
admin.site.register(UserPreference)
admin.site.register(UserFollow)
