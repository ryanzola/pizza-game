from django.urls import path
from . import views

urlpatterns = [
    path('get_orders/', views.get_orders, name='get_orders'),  # Add this line
    path('get_order/', views.construct_order, name='construct_order'),
    path('get_user_orders/', views.get_user_orders, name='get_user_orders'),
    path('attach_user_to_orders/', views.attach_user_to_orders, name='attach_user_to_orders'),
    path('update_order_status/<str:order_id>/', views.update_order_status, name='update_order_status'),
    path('past_orders/', views.past_orders, name='past_orders'),
    path('start_session/', views.start_session, name='start_session'),
    path('end_session/', views.end_session, name='end_session'),
    path('clear_queued_orders/', views.clear_queued_orders, name='clear_queued_orders'),
]
