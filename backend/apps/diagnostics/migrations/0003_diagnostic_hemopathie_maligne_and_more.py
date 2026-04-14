from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("diagnostics", "0002_diagnostic_afp_diagnostic_ca_125_diagnostic_ca_19_9_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="diagnostic",
            name="examens_complementaires",
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name="diagnostic",
            name="hemopathie_maligne",
            field=models.CharField(
                blank=True,
                choices=[
                    ("lymphome_non_hodgkinien", "Lymphome non Hodgkinien"),
                    ("lymphome_hodgkin", "Lymphome de Hodgkin"),
                    ("myelome", "Myélome ou Maladie de Kahler"),
                    ("llc", "Leucémie Lymphoïde Chronique"),
                    ("lmc", "Leucémie Myéloïde Chronique"),
                    ("lam", "Leucémie Aiguë Myéloïde"),
                    ("lal", "Leucémie Aiguë Lymphoïde"),
                    ("polyglobulie_vaquez", "Polyglobulie de Vaquez"),
                    ("thrombocytemie_essentielle", "Thrombocytémie essentielle"),
                    ("myelofibrose_primitive", "Myélofibrose primitive"),
                    ("smp_inclassable", "Syndrome myéloprolifératif inclassable"),
                    ("smd", "Syndromes myélodysplasiques"),
                    ("waldenstrom", "Maladie de Waldenström"),
                    ("tricholeucocytes", "Leucémie à Tricholeucocytes"),
                ],
                max_length=40,
            ),
        ),
    ]
