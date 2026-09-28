import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('suivi', '0004_consultationsuivi_duree_minutes'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('patients', '0005_patient_confirmation_fields'),
    ]

    operations = [migrations.CreateModel(
        name='RendezVousWaitlist',
        fields=[
            ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
            ('etablissement', models.CharField(blank=True, max_length=200)),
            ('type_consultation', models.CharField(default='suivi', max_length=20)),
            ('statut', models.CharField(choices=[('waiting', 'En attente'), ('offered', 'Créneau proposé'), ('booked', 'Rendez-vous créé'), ('cancelled', 'Retiré')], default='waiting', max_length=20)),
            ('date_proposee', models.DateField(blank=True, null=True)),
            ('heure_proposee', models.TimeField(blank=True, null=True)),
            ('date_creation', models.DateTimeField(auto_now_add=True)),
            ('date_proposition', models.DateTimeField(blank=True, null=True)),
            ('cree_par', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='rendezvous_waitlist_crees', to=settings.AUTH_USER_MODEL)),
            ('medecin', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='rendezvous_waitlist', to=settings.AUTH_USER_MODEL)),
            ('patient', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='rendezvous_waitlist', to='patients.patient')),
        ],
        options={'db_table': 'rendezvous_waitlist', 'ordering': ['date_creation']},
    )]
