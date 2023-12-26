from django.urls import path
from . import views

urlpatterns = [
    path('google_login/', views.google_login, name='google_login'),
    path('set_savings/', views.set_savings, name='set_savings'),
]
