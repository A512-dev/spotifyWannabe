from rest_framework import serializers

from notifications.models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    userId = serializers.SerializerMethodField()
    readAt = serializers.DateTimeField(source="read_at", read_only=True)
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    actionHref = serializers.CharField(source="action_href", read_only=True)

    class Meta:
        model = Notification
        fields = ["id", "userId", "type", "title", "message", "readAt", "createdAt", "actionHref"]

    def get_userId(self, obj) -> str:
        return str(obj.recipient_id)
