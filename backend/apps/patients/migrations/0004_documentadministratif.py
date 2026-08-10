from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [('patients', '0003_patient_nom_jeune_fille_patient_num_matricule_and_more'), migrations.swappable_dependency(settings.AUTH_USER_MODEL)]

    operations = [
        migrations.CreateModel(
            name='DocumentAdministratif',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('fichier', models.FileField(upload_to='patients/documents_administratifs/%Y/%m/')),
                ('nom', models.CharField(max_length=200)),
                ('type_document', models.CharField(choices=[('identite', "Pièce d'identité"), ('assurance', "Attestation d'assurance"), ('orientation', "Lettre d'orientation"), ('autre', 'Autre document')], default='autre', max_length=20)),
                ('statut', models.CharField(choices=[('brouillon', 'Brouillon'), ('envoye', 'Envoyé pour validation'), ('valide', 'Validé'), ('refuse', 'Refusé')], default='brouillon', max_length=20)),
                ('commentaire', models.TextField(blank=True)), ('date_ajout', models.DateTimeField(auto_now_add=True)), ('date_envoi', models.DateTimeField(blank=True, null=True)), ('date_validation', models.DateTimeField(blank=True, null=True)),
                ('ajoute_par', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='documents_administratifs_ajoutes', to=settings.AUTH_USER_MODEL)),
                ('medecin_validateur', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='documents_administratifs_a_valider', to=settings.AUTH_USER_MODEL)),
                ('patient', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='documents_administratifs', to='patients.patient')),
            ], options={'db_table': 'documents_administratifs', 'ordering': ['-date_ajout']},
        ),
    ]
