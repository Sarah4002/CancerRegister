from apps.accounts.models import User
from apps.notifications.models import Notification

from .models import Patient


class PatientPendingObserver:
    """Abonné qui notifie les médecins lorsqu'un patient attend confirmation."""

    def update(self, patient, created_by=None):
        if patient.statut_confirmation != Patient.StatutConfirmation.EN_ATTENTE:
            return
        recipients = User.objects.filter(
            role__in=['doctor', 'doctor_chef'],
            is_active=True,
        )
        Notification.objects.bulk_create([
            Notification(
                destinataire=user,
                type=Notification.Type.DOSSIER_AJOUTE,
                titre='Nouveau dossier en attente',
                message=(
                    f"Un nouveau patient {patient.get_full_name()} a été créé et est en attente "
                    "de confirmation médicale."
                ),
                dossier_id=patient.id,
            )
            for user in recipients
        ])


class PatientEventPublisher:
    """Publisher minimal : notifie les observers abonnés à la création patient."""

    def __init__(self):
        self._observers = []

    def subscribe(self, observer):
        self._observers.append(observer)

    def patient_created(self, patient, created_by=None):
        for observer in self._observers:
            observer.update(patient, created_by=created_by)


patient_events = PatientEventPublisher()
patient_events.subscribe(PatientPendingObserver())
