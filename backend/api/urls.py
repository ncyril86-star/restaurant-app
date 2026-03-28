from django.urls import path
from . import views

urlpatterns = [
    path("health/", views.health),
    path("menu/", views.menu_list),
    path("menu/<str:item_id>/", views.menu_detail),
    path("orders/", views.orders_list),
    path("orders/<str:order_id>/", views.order_detail),
    path("orders/<str:order_id>/pay/", views.mark_order_paid),
    path("analytics/", views.analytics),
    path("test-email/", views.test_email),
    path("db-check/", views.db_check),
]