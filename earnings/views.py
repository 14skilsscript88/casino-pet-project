from django.shortcuts import render, get_object_or_404
from django.core.exceptions import PermissionDenied

from users.models import TelegramUser


def earn(request):
    user_id = request.session.get("user_id")
    lang = request.session.get("lang")
    
    if not user_id or not lang:
        raise PermissionDenied("Session expired")

    user = get_object_or_404(TelegramUser, telegram_id=user_id)

    data = {
        "user": user,
        "lang": lang
    }

    return render(request, 'earnings/earn.html', data)