from django.urls import path
from . import views

urlpatterns = [
    path('google_login/', views.google_login, name='google_login'),
    path('get_savings/', views.get_savings, name='get_savings'),
    path('update_savings/', views.update_savings, name='update_savings'),
    path('get_bank/', views.get_bank, name='get_bank'),
    path('update_bank/', views.update_bank, name='update_bank'),
]
