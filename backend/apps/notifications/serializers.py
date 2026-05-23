from rest_framework import serializers
from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    type_label = serializers.CharField(source='get_type_display', read_only=True)

    class Meta:
        model  = Notification
        fields = [
            'id', 'type', 'type_label', 'titre', 'message',
            'lue', 'date_envoi', 'reunion_id', 'dossier_id',
        ]
        read_only_fields = ['date_envoi']