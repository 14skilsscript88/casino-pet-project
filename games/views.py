from django.shortcuts import render, redirect, get_object_or_404
from django.core.exceptions import PermissionDenied
from django.utils import timezone
from datetime import timedelta

from .models import Case
from api.utils import get_share_message_id
from users.models import TelegramUser


def games(request):
    user_id = request.session.get("user_id")
    lang = request.session.get("lang")
    
    if not user_id or not lang:
        raise PermissionDenied("Session expired")
    
    user = get_object_or_404(TelegramUser, telegram_id=user_id)
    cases = Case.objects.filter(is_active=True).prefetch_related('items__gift')

    data = {
        "cases": cases,
        "user": user,
        "lang": lang
    }

    return render(request, 'games/games.html', data)


def open_case(request, case_slug):
    user_id = request.session.get("user_id")
    lang = request.session.get("lang")
    if not user_id or not lang:
        raise PermissionDenied("Session expired")

    if case_slug == "free-case":
        return redirect('free_case')
    elif case_slug == "promo-case":
        return redirect('promo_case') 

    user = get_object_or_404(TelegramUser, telegram_id=user_id)
    case = get_object_or_404(Case, slug=case_slug, is_active=True)
    case_items = case.items.select_related('gift').all()

    data = {
        "case": case,
        "case_items": case_items,
        "user": user,
        "lang": lang
    }
    return render(request, 'games/open_case.html', data)


def free_case(request):
    user_id = request.session.get("user_id")
    lang = request.session.get("lang")
    if not user_id or not lang:
        raise PermissionDenied("Session expired")

    user = get_object_or_404(TelegramUser, telegram_id=user_id)
    case = get_object_or_404(Case, slug="free-case", is_active=True)
    case_items = case.items.select_related('gift').all()

    now = timezone.now()
    cooldown_ends_at = None
    can_claim_by_cooldown = True
    if user.last_free_case_at:
        cooldown_ends_at = user.last_free_case_at + timedelta(hours=24)
        can_claim_by_cooldown = now >= cooldown_ends_at

    forward_done_this_cycle = bool(
        user.last_forward_task_done_at and
        (not user.last_free_case_at or user.last_forward_task_done_at > user.last_free_case_at)
    )

    share_message_id = get_share_message_id(user_id) or ""

    data = {
        "case": case,
        "case_items": case_items,
        "user": user,
        "can_claim": can_claim_by_cooldown,
        "cooldown_ends_at": cooldown_ends_at.isoformat() if cooldown_ends_at else "",
        "forward_done_this_cycle": forward_done_this_cycle,
        "share_message_id": share_message_id,
        "lang": lang,
        "channel_url": "https://t.me/BlazeGift_News"
    }

    return render(request, 'games/free_case.html', data)


def promo_case(request):
    user_id = request.session.get("user_id")
    lang = request.session.get("lang")
    if not user_id or not lang:
        raise PermissionDenied("Session expired")

    user = get_object_or_404(TelegramUser, telegram_id=user_id)
    case = get_object_or_404(Case, slug="promo-case", is_active=True)
    case_items = case.items.select_related('gift').all()

    data = {
        "case": case,
        "user": user,
        "case_items": case_items,
        "lang": lang
    }

    return render(request, 'games/promo_case.html', data)