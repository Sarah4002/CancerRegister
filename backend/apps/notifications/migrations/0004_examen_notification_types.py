from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('notifications', '0003_alter_notification_type'),
    ]

    operations = [
        migrations.AlterField(
            model_name='notification',
            name='type',
            field=models.CharField(max_length=30, choices=[
                ('rcp_invite', 'Invitation à une RCP'),
                ('rcp_demarre', 'Réunion démarrée'),
                ('rcp_terminee', 'Réunion terminée'),
                ('nouveau_msg', 'Nouveau message'),
                ('new_decision', 'Nouvelle décision'),
                ('dossier_ajoute', 'Dossier ajouté'),
                ('examen_demande', 'Examen demandé'),
                ('examen_resultat', 'Résultat d’examen disponible'),
            ]),
        ),
    ]
