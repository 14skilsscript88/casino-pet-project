from django.shortcuts import render, get_object_or_404
from django.core.exceptions import PermissionDenied
from django.db.models import F

from .models import TelegramUser, LeaderboardPerMonth


def profile(request):
    user_id = request.session.get("user_id")
    lang = request.session.get("lang")

    if not user_id or not lang:
        raise PermissionDenied("Session expired")

    user = get_object_or_404(TelegramUser, telegram_id=user_id)
    inventory_items = user.inventory.items.select_related('gift').all()
    total_items_count = sum(item.amount for item in inventory_items)

    data = {
        "user": user,
        "user_id": user_id,
        "lang": lang,
        "inventory_items": inventory_items,
        "total_items_count": total_items_count
    }

    return render(request, 'users/profile.html', data)


def leaderboard(request):
    user_id = request.session.get("user_id")
    lang = request.session.get("lang")

    if not user_id or not lang:
        raise PermissionDenied("Session expired")

    user = get_object_or_404(TelegramUser, telegram_id=user_id)

    top_users_per_month = LeaderboardPerMonth.objects.select_related("user").annotate(
        turnover=F('earned') + F('deposited') + F('spent')
    ).order_by('-turnover')[:10]

    current_user_per_month = LeaderboardPerMonth.objects.annotate(
        turnover=F('earned') + F('deposited') + F('spent')
    ).get(user__telegram_id=user_id)

    rank_per_month = LeaderboardPerMonth.objects.annotate(
        turnover=F('earned') + F('deposited') + F('spent')
    ).filter(turnover__gt=current_user_per_month.turnover).count() + 1

    top_users_per_total = TelegramUser.objects.all()[:10]
    current_user_per_total = TelegramUser.objects.get(telegram_id=user_id)
    
    data = {
        "balance": user.balance,
        "lang": lang,
        "top_users_per_month": top_users_per_month,
        "current_user_per_month": current_user_per_month,
        "current_user_rank_per_month": rank_per_month,
        "top_users_per_total": top_users_per_total,
        "current_user_per_total": current_user_per_total,
        "current_user_rank_per_total": current_user_per_total.pk
    }

    return render(request, 'users/leaderboard.html', data)
