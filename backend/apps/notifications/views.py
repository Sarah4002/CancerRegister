from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Notification
from .serializers import NotificationSerializer


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class   = NotificationSerializer

    def get_queryset(self):
        return Notification.objects.filter(destinataire=self.request.user)

    @action(detail=False, methods=['get'])
    def non_lues(self, request):
        qs = self.get_queryset().filter(lue=False)
        return Response({
            'count': qs.count(),
            'notifications': NotificationSerializer(qs[:20], many=True).data,
        })

    @action(detail=True, methods=['post'])
    def marquer_lue(self, request, pk=None):
        notif = self.get_object()
        notif.lue = True
        notif.save()
        return Response({'status': 'ok'})

    @action(detail=False, methods=['post'])
    def tout_marquer_lues(self, request):
        self.get_queryset().filter(lue=False).update(lue=True)
        return Response({'status': 'ok'})