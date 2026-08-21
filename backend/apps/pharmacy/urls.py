from django.urls import include, path
from rest_framework.routers import DefaultRouter
from .views import StockViewSet

router = DefaultRouter()
router.register(r'stock', StockViewSet, basename='pharmacy-stock')

urlpatterns = [path('', include(router.urls))]
