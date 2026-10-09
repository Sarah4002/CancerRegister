from rest_framework import viewsets, filters, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied
from apps.accounts.permissions import CanManageMedicalExams
from apps.notifications.models import Notification
from django.contrib.auth import get_user_model
from django_filters.rest_framework import DjangoFilterBackend
from .models import ExamenMedical
from .serializers import ExamenMedicalSerializer

class ExamenMedicalViewSet(viewsets.ModelViewSet):
    serializer_class = ExamenMedicalSerializer
    permission_classes = [IsAuthenticated, CanManageMedicalExams]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['patient', 'categorie', 'statut']
    search_fields = ['nom_examen', 'resultat']
    ordering_fields = ['date_prescription', 'date_realisation']
    ordering = ['-date_prescription']

    def get_queryset(self):
        queryset = ExamenMedical.objects.all().select_related('prescrit_par', 'patient')
        role = self.request.user.role
        if role in {'radiologist', 'anapath', 'laboratory'}:
            return queryset.filter(service_destinataire=role)
        if role not in {'doctor', 'doctor_chef'}:
            return queryset.none()
        return queryset

    def perform_create(self, serializer):
        if self.request.user.role not in {'doctor', 'doctor_chef'}:
            raise PermissionDenied("Seul un médecin peut prescrire un examen.")
        service = {'imagerie': 'radiologist', 'anapath': 'anapath', 'biologie': 'laboratory'}.get(
            serializer.validated_data.get('categorie'), ''
        )
        examen = serializer.save(prescrit_par=self.request.user, service_destinataire=service)
        if service:
            User = get_user_model()
            for user in User.objects.filter(role=service, is_active=True):
                Notification.objects.create(
                    destinataire=user, type='examen_demande',
                    titre=f"Nouvel examen : {examen.nom_examen}",
                    message=f"Dossier {examen.patient.registration_number} — {examen.patient.nom} {examen.patient.prenom}",
                    dossier_id=examen.patient_id,
                )

    def perform_update(self, serializer):
        examen = self.get_object()
        role = self.request.user.role
        is_prescriber = role in {'doctor', 'doctor_chef'}
        if not is_prescriber and role != examen.service_destinataire:
            raise PermissionDenied("Cet examen ne relève pas de votre service.")
        if is_prescriber:
            protected_fields = {'resultat', 'date_realisation', 'fichier_resultat', 'statut'}
            if set(self.request.data.keys()) & protected_fields:
                raise PermissionDenied("Seul le service chargé de l’examen peut saisir son résultat.")
        else:
            allowed_fields = {'resultat', 'date_realisation', 'statut', 'fichier_resultat', 'observations'}
            if set(self.request.data.keys()) - allowed_fields:
                raise PermissionDenied("Vous pouvez uniquement compléter le résultat de l'examen.")
        updated = serializer.save()
        if not is_prescriber and updated.prescrit_par_id:
            Notification.objects.create(
                destinataire=updated.prescrit_par, type='examen_resultat',
                titre=f"Résultat disponible : {updated.nom_examen}",
                message=f"Le résultat est disponible dans le dossier {updated.patient.registration_number}.",
                dossier_id=updated.patient_id,
                examen_id=updated.id,
            )
