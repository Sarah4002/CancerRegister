from .models import Patient
from .query_builder import PatientQueryBuilder


class PatientRepository:
    """Repository dédié aux lectures patient; encapsule l'ORM et le query builder."""

    def build_queryset(self, request, action):
        return PatientQueryBuilder(request, action)

    def get_by_id(self, patient_id):
        return Patient.objects.filter(pk=patient_id).first()
