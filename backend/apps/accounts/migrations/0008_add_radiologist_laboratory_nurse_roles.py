from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0007_alter_user_role'),
    ]

    operations = [
        migrations.AlterField(
            model_name='user',
            name='role',
            field=models.CharField(
                choices=[
                    ('admin', 'Administrateur'),
                    ('doctor', 'Médecin Oncologue'),
                    ('anapath', 'Médecin Anapath'),
                    ('epidemiologist', 'Épidémiologiste'),
                    ('pharmacist', 'Pharmacien'),
                    ('readonly', 'Lecture seule'),
                    ('secretaire', 'Saisie des données'),
                    ('doctor_chef', 'Médecin Chef'),
                    ('radiologist', 'Radiologue'),
                    ('laboratory', 'Laboratoire'),
                    ('nurse', 'Infirmière'),
                ],
                default='readonly',
                max_length=20,
            ),
        ),
    ]
