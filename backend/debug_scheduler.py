import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
import django
django.setup()
from django.core.management import call_command
from datetime import time
from django.utils import timezone
from apps.accounts.models import User
from apps.patients.models import Patient
from apps.patients.views import creer_rdv_premiere_visite
from apps.suivi.models import ConsultationSuivi

call_command('migrate', run_syncdb=True, verbosity=0)
User.objects.all().delete()
Patient.objects.all().delete()
ConsultationSuivi.objects.all().delete()

secretary = User.objects.create_user(email='secretaire@example.com', username='secretaire', first_name='Secr', last_name='Taire', role='secretaire', password='Password123!')
self_doctor = User.objects.create_user(email='doctor@example.com', username='doctor', first_name='Doc', last_name='Tor', role='doctor', password='Password123!')
doctor_1 = User.objects.create_user(email='doctor1@example.com', username='doctor1', first_name='Medecin', last_name='Un', role='doctor', password='Password123!')
doctor_2 = User.objects.create_user(email='doctor2@example.com', username='doctor2', first_name='Medecin', last_name='Deux', role='doctor', password='Password123!')

now = timezone.localtime(timezone.now())
slot_hour = now.hour if now.minute == 0 else now.hour + 1
slot_hour = max(8, min(slot_hour, 15))
candidate_time = time(hour=slot_hour, minute=0)
candidate_date = now.date()
print('now:', now)
print('slot_hour:', slot_hour)
print('candidate_date:', candidate_date)
print('candidate_time:', candidate_time)
for doctor in [self_doctor, doctor_1]:
    patient = Patient.objects.create(nom=f'Conflict{doctor.id}', prenom='Patient', sexe='M', cree_par=secretary)
    ConsultationSuivi.objects.create(
        patient=patient,
        medecin=doctor,
        type_consultation='suivi',
        statut='planifiee',
        date_consultation=candidate_date,
        heure=candidate_time,
        cree_par=secretary,
    )

print('doctors before helper:')
for u in User.objects.filter(role__in=['doctor', 'doctor_chef'], is_active=True).order_by('id'):
    print(u.id, u.role, u.username)

patient = Patient.objects.create(nom='Auto', prenom='RDV', sexe='F', cree_par=secretary)
appointment = creer_rdv_premiere_visite(patient, created_by=secretary)
print('appointment', appointment)
print('appointment fields', appointment and (appointment.id, appointment.medecin_id, appointment.date_consultation, appointment.heure))
print('all consultations:')
for c in ConsultationSuivi.objects.all().values_list('id','patient__nom','medecin_id','date_consultation','heure'):
    print(c)
