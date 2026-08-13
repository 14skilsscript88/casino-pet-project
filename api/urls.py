from django.urls import path

from . import views


urlpatterns = [
    path('initial-data/', views.initial_data, name='initial_data'),
    path('change-lang/', views.change_lang, name="change_lang"),
    path('check-subscription/', views.check_subscription, name="check_subscription"),
    path('case/<slug:case_slug>/open/', views.spin_case, name="spin_case"),
    path('promo/activate/', views.activate_promo, name="activate_promo"),
    path('tasks/check-free-case/', views.check_free_case_tasks, name='check_free_case_tasks'),
    path('tasks/mark-forward/', views.mark_forward_done, name='mark_forward_done'),
    path('live-feed/', views.live_feed, name="live_lived"),
    path('gift/sale/', views.sale_gift, name="sale_gift"),
    path('gift/sale/all/', views.sale_all_gifts, name="sale_all_gifts"),
    path('gift/withdraw/', views.withdraw_gift, name="withdraw_gift")
]