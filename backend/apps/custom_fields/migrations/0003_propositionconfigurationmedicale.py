from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('custom_fields', '0002_alter_champpersonnalise_topographie_code_and_more'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='PropositionConfigurationMedicale',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('type_proposition', models.CharField(choices=[('champ', 'Champ personnalisé'), ('regle', 'Règle de validation')], max_length=10)),
                ('donnees', models.JSONField(default=dict)),
                ('justification', models.TextField()),
                ('statut', models.CharField(choices=[('en_attente', 'En attente'), ('approuvee', 'Approuvée'), ('refusee', 'Refusée')], default='en_attente', max_length=15)),
                ('commentaire_decision', models.TextField(blank=True)),
                ('date_creation', models.DateTimeField(auto_now_add=True)),
                ('date_decision', models.DateTimeField(blank=True, null=True)),
                ('proposee_par', models.ForeignKey(on_delete=models.deletion.CASCADE, related_name='propositions_medicales', to=settings.AUTH_USER_MODEL)),
                ('traitee_par', models.ForeignKey(blank=True, null=True, on_delete=models.deletion.SET_NULL, related_name='propositions_medicales_traitees', to=settings.AUTH_USER_MODEL)),
            ],
            options={'db_table': 'medical_configuration_proposals', 'ordering': ['-date_creation']},
        ),
    ]
