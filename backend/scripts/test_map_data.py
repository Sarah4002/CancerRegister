import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
import django
django.setup()
from django.test import RequestFactory
from apps.sig.views import get_map_data

req = RequestFactory().get('/sig/map-data/')
resp = get_map_data(req)
print('status', resp.status_code)
print(resp.data)
