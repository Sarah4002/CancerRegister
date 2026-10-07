from django.utils import timezone

from .models import Patient


class PatientConfirmationState:
    """Comportement d'un état du workflow de confirmation patient."""

    status = None

    def __init__(self, patient):
        self.patient = patient

    @classmethod
    def for_patient(cls, patient):
        states = {
            Patient.StatutConfirmation.EN_ATTENTE: PendingConfirmationState,
            Patient.StatutConfirmation.CONFIRME: ConfirmedPatientState,
            Patient.StatutConfirmation.REFUSE: RefusedPatientState,
        }
        return states.get(patient.statut_confirmation, PendingConfirmationState)(patient)

    def confirm(self, user):
        raise NotImplementedError

    def reject(self, user, reason):
        raise NotImplementedError

    def _transition(self, target, user, extra_fields):
        patient = self.patient
        patient.statut_confirmation = target
        patient.confirme_par = user
        patient.date_confirmation = timezone.now()
        for field, value in extra_fields.items():
            setattr(patient, field, value)
        patient.save(update_fields=[
            'statut_confirmation', 'motif_refus', 'confirme_par',
            'date_confirmation', 'date_modification',
        ])


class PendingConfirmationState(PatientConfirmationState):
    status = Patient.StatutConfirmation.EN_ATTENTE

    def confirm(self, user):
        self._transition(Patient.StatutConfirmation.CONFIRME, user, {'motif_refus': ''})

    def reject(self, user, reason):
        self._transition(Patient.StatutConfirmation.REFUSE, user, {'motif_refus': reason})


class ConfirmedPatientState(PatientConfirmationState):
    status = Patient.StatutConfirmation.CONFIRME

    def confirm(self, user):
        # Confirmer à nouveau un dossier confirmé est idempotent.
        return self.patient

    def reject(self, user, reason):
        self._transition(Patient.StatutConfirmation.REFUSE, user, {'motif_refus': reason})


class RefusedPatientState(PatientConfirmationState):
    status = Patient.StatutConfirmation.REFUSE

    def confirm(self, user):
        # Une décision médicale ultérieure peut corriger un refus antérieur.
        self._transition(Patient.StatutConfirmation.CONFIRME, user, {'motif_refus': ''})

    def reject(self, user, reason):
        self._transition(Patient.StatutConfirmation.REFUSE, user, {'motif_refus': reason})
