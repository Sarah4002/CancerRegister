from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.notifications.models import Notification
from apps.patients.models import Patient
from apps.patients.views import creer_rdv_premiere_visite
from apps.suivi.models import ConsultationSuivi


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


class PatientConfirmationWorkflowTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.secretary = User.objects.create_user(
            email='secretaire@example.com',
            username='secretaire',
            first_name='Secr',
            last_name='Taire',
            role='secretaire',
            password='Password123!',
        )
        self.doctor = User.objects.create_user(
            email='doctor@example.com',
            username='doctor',
            first_name='Doc',
            last_name='Tor',
            role='doctor',
            password='Password123!',
        )

    def test_patient_created_by_secretary_starts_in_waiting_list(self):
        patient = Patient.objects.create(
            nom='Ait',
            prenom='Mohamed',
            sexe='M',
            cree_par=self.secretary,
        )

        self.assertEqual(patient.statut_confirmation, Patient.StatutConfirmation.EN_ATTENTE)
        self.assertEqual(
            Patient.objects.filter(statut_confirmation=Patient.StatutConfirmation.EN_ATTENTE).count(),
            1,
        )

    def test_doctor_can_confirm_patient_and_it_enters_registry(self):
        patient = Patient.objects.create(
            nom='Benkhelil',
            prenom='Nadia',
            sexe='F',
            cree_par=self.secretary,
            statut_confirmation=Patient.StatutConfirmation.EN_ATTENTE,
        )
        self.client.force_authenticate(user=self.doctor)

        response = self.client.post(
            f'/api/v1/patients/{patient.id}/confirmer/',
            {'decision': 'confirme'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        patient.refresh_from_db()
        self.assertEqual(patient.statut_confirmation, Patient.StatutConfirmation.CONFIRME)
        self.assertEqual(patient.confirme_par_id, self.doctor.id)
        self.assertEqual(
            Patient.objects.filter(statut_confirmation=Patient.StatutConfirmation.EN_ATTENTE).count(),
            0,
        )

    def test_doctor_can_refuse_patient_with_reason(self):
        patient = Patient.objects.create(
            nom='Chelli',
            prenom='Samir',
            sexe='M',
            cree_par=self.secretary,
            statut_confirmation=Patient.StatutConfirmation.EN_ATTENTE,
        )
        self.client.force_authenticate(user=self.doctor)

        response = self.client.post(
            f'/api/v1/patients/{patient.id}/confirmer/',
            {'decision': 'refuse', 'motif_refus': 'Résultats négatifs'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        patient.refresh_from_db()
        self.assertEqual(patient.statut_confirmation, Patient.StatutConfirmation.REFUSE)
        self.assertEqual(patient.motif_refus, 'Résultats négatifs')
        self.assertEqual(patient.confirme_par_id, self.doctor.id)

    def test_secretary_can_list_pending_patients(self):
        patient = Patient.objects.create(
            nom='Messaoud',
            prenom='Amel',
            sexe='F',
            cree_par=self.secretary,
            statut_confirmation=Patient.StatutConfirmation.EN_ATTENTE,
        )
        self.client.force_authenticate(user=self.secretary)

        response = self.client.get('/api/v1/patients/en_attente/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()['count'], 1)
        self.assertEqual(response.json()['results'][0]['id'], patient.id)

    def test_new_patient_creation_notifies_doctors(self):
        doctor_chef = User.objects.create_user(
            email='chef@example.com',
            username='chef',
            first_name='Chef',
            last_name='Doc',
            role='doctor_chef',
            password='Password123!',
        )
        self.client.force_authenticate(user=self.secretary)

        response = self.client.post(
            '/api/v1/patients/',
            {'nom': 'Nouveau', 'prenom': 'Patient', 'sexe': 'F'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        patient = Patient.objects.filter(nom='Nouveau', prenom='Patient').latest('id')
        self.assertEqual(patient.statut_confirmation, Patient.StatutConfirmation.EN_ATTENTE)
        self.assertTrue(
            Notification.objects.filter(
                destinataire=doctor_chef,
                type=Notification.Type.DOSSIER_AJOUTE,
                dossier_id=patient.id,
            ).exists()
        )

    def test_new_waiting_patient_gets_first_free_doctor_slot_automatically(self):
        from datetime import time, timedelta
        from django.utils import timezone

        doctor_1 = User.objects.create_user(
            email='doctor1@example.com',
            username='doctor1',
            first_name='Medecin',
            last_name='Un',
            role='doctor',
            password='Password123!',
        )
        doctor_2 = User.objects.create_user(
            email='doctor2@example.com',
            username='doctor2',
            first_name='Medecin',
            last_name='Deux',
            role='doctor',
            password='Password123!',
        )

        now = timezone.localtime(timezone.now())
        if now.hour >= 15:
            candidate_date = now.date() + timedelta(days=1)
            candidate_hour = 8
        else:
            candidate_date = now.date()
            candidate_hour = min(max(now.hour + 1, 8), 15)
        candidate_time = time(hour=candidate_hour, minute=0)

        for doctor in [self.doctor, doctor_1]:
            ConsultationSuivi.objects.create(
                patient=Patient.objects.create(nom=f'Conflict{doctor.id}', prenom='Patient', sexe='M', cree_par=self.secretary),
                medecin=doctor,
                type_consultation='suivi',
                statut='planifiee',
                date_consultation=candidate_date,
                heure=candidate_time,
                cree_par=self.secretary,
            )

        patient = Patient.objects.create(nom='Auto', prenom='RDV', sexe='F', cree_par=self.secretary)
        appointment = creer_rdv_premiere_visite(patient, created_by=self.secretary)

        self.assertIsNotNone(appointment)
        self.assertEqual(appointment.medecin_id, doctor_2.id)
        self.assertEqual(appointment.date_consultation, candidate_date)
        self.assertEqual(str(appointment.heure), candidate_time.strftime('%H:%M:%S'))
        self.assertEqual(patient.statut_confirmation, Patient.StatutConfirmation.EN_ATTENTE)
