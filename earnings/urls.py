from django.urls import path

from . import views


urlpatterns = [
    path('earn/', views.earn, name="earn")
]
