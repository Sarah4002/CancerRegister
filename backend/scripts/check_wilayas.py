import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
import django
django.setup()
from apps.patients.models import Patient
from django.db.models import Count
print('distinct:', list(Patient.objects.values_list('wilaya', flat=True).distinct()[:20]))
print('counts:', list(Patient.objects.values('wilaya').annotate(cnt=Count('id')).order_by('-cnt')[:10]))
