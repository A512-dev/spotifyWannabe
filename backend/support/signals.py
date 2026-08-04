from django.dispatch import Signal

# Notification integrations can subscribe without coupling the support app to accounts.
ticket_created = Signal()
ticket_message_added = Signal()
ticket_status_changed = Signal()
