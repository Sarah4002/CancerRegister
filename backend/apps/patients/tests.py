from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from apps.patients.models import Patient


class PublicPatientQRTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_public_endpoint_can_resolve_patient_with_registration_number_reference(self):
        patient = Patient.objects.create(
            registration_number='P-2026-0049',
            nom='Test',
            prenom='Patient',
            sexe='M',
        )

        response = self.client.get(
            f'/api/v1/patients/{patient.registration_number}/public/',
            {'ref': patient.registration_number},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()['registration_number'], patient.registration_number)
