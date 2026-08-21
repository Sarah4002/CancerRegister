# Generated manually for the pharmacy inventory module.
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True
    dependencies = [migrations.swappable_dependency(settings.AUTH_USER_MODEL)]
    operations = [
        migrations.CreateModel(name='Medicament', fields=[('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')), ('dci', models.CharField(max_length=150)), ('forme', models.CharField(max_length=150)), ('seuil_alerte', models.PositiveIntegerField(default=0)), ('actif', models.BooleanField(default=True)), ('cree_le', models.DateTimeField(auto_now_add=True)), ('modifie_le', models.DateTimeField(auto_now=True))], options={'db_table': 'pharmacie_medicament', 'ordering': ['dci', 'forme']}),
        migrations.CreateModel(name='LotStock', fields=[('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')), ('numero_lot', models.CharField(max_length=80)), ('quantite', models.PositiveIntegerField(default=0)), ('date_expiration', models.DateField(blank=True, null=True)), ('cree_le', models.DateTimeField(auto_now_add=True)), ('modifie_le', models.DateTimeField(auto_now=True)), ('medicament', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='lots', to='pharmacy.medicament'))], options={'db_table': 'pharmacie_lot_stock', 'ordering': ['date_expiration', 'medicament__dci']}),
        migrations.CreateModel(name='MouvementStock', fields=[('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')), ('type', models.CharField(choices=[('entree', 'Entrée'), ('sortie', 'Sortie'), ('ajustement', 'Ajustement')], max_length=15)), ('quantite', models.IntegerField(help_text='Variation signée : positive pour une entrée, négative pour une sortie.')), ('commentaire', models.CharField(blank=True, max_length=255)), ('cree_le', models.DateTimeField(auto_now_add=True)), ('effectue_par', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='mouvements_stock_pharmacie', to=settings.AUTH_USER_MODEL)), ('lot', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='mouvements', to='pharmacy.lotstock'))], options={'db_table': 'pharmacie_mouvement_stock', 'ordering': ['-cree_le']}),
        migrations.AddConstraint(model_name='medicament', constraint=models.UniqueConstraint(fields=('dci', 'forme'), name='pharmacie_medicament_dci_forme_uniq')),
        migrations.AddConstraint(model_name='lotstock', constraint=models.UniqueConstraint(fields=('medicament', 'numero_lot'), name='pharmacie_lot_numero_uniq')),
    ]
