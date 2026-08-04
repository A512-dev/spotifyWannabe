from django.dispatch import Signal

# The notifications app can subscribe to this signal and create an in-app
# notification without coupling the artist workflow to the account domain.
artist_application_reviewed = Signal()
artist_application_submitted = Signal()
