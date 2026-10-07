from .models import Patient
from .states import PatientConfirmationState


class ChangePatientStatusCommand:
    """Commande explicite de changement du statut du dossier patient."""

    def __init__(self, patient, new_status):
        self.patient = patient
        self.new_status = new_status

    def execute(self):
        if self.new_status not in dict(Patient.StatutDossier.choices):
            raise ValueError('Statut invalide.')
        self.patient.statut_dossier = self.new_status
        self.patient.save(update_fields=['statut_dossier'])
        return self.patient


class DecidePatientConfirmationCommand:
    """Commande confirm/refuse déléguée à l'état courant du workflow."""

    def __init__(self, patient, user, decision, refusal_reason=''):
        self.patient = patient
        self.user = user
        self.decision = decision
        self.refusal_reason = refusal_reason

    def execute(self):
        state = PatientConfirmationState.for_patient(self.patient)
        if self.decision == 'confirme':
            state.confirm(self.user)
        elif self.decision == 'refuse':
            state.reject(self.user, self.refusal_reason)
        else:
            raise ValueError('Décision invalide.')
        return self.patient
