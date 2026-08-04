from django.contrib import admin
from subscriptions.models import PaymentTransaction, UserSubscription

admin.site.register(UserSubscription)
admin.site.register(PaymentTransaction)
