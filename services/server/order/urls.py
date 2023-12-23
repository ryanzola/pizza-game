from django.urls import path
from . import views

urlpatterns = [
    path('get_order/', views.construct_order, name='construct_order'),
    path('past_orders/', views.past_orders, name='past_orders'),
]
