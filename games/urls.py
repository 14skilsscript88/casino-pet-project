from django.urls import path

from . import views


urlpatterns = [
    path('', views.games, name='games'),
    path('case/free/', views.free_case, name='free_case'),
    path('case/promo/', views.promo_case, name='promo_case'),    
    path('case/<slug:case_slug>/', views.open_case, name='open_case'),
]