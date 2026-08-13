from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse
from django.core.exceptions import BadRequest, PermissionDenied
from django.views.decorators.http import require_POST, require_GET
from django.views.decorators.csrf import csrf_exempt
from django.db.models import F
from django.db import transaction
from django.conf import settings
from decimal import Decimal
from django.utils import timezone
from datetime import timedelta
import json
import requests
import secrets

from users.models import TelegramUser, Inventory, InventoryItem,LeaderboardPerMonth
from games.models import Case, CaseOpening, PromoCode, PromoCodeActivation
from users.views import profile
from .utils import get_weighted_gift, notify_admins_about_withdraw
from .models import Withdrawals


@csrf_exempt
@require_POST
def initial_data(request):
    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        raise BadRequest("Invalid JSON")
    
    telegram_id = data.get('telegram_id')

    if not telegram_id:
        raise BadRequest("telegram_id is required")

    user, created = TelegramUser.objects.get_or_create(
        telegram_id=telegram_id, 
        defaults={
            "name": data.get("name"), 
            "username": data.get("username"),
        }
    )

    if user.is_banned:
        raise PermissionDenied("Your account has been banned")
        
    if not created:
        user.name = data.get("name")
        user.username = data.get("username")
        user.save(update_fields=["name", "username"])
    else:
        Inventory.objects.get_or_create(user=user)
        LeaderboardPerMonth.objects.get_or_create(user=user)

        ref_id = data.get("start_param")
        if ref_id and ref_id != user.telegram_id:
            updated = TelegramUser.objects.filter(telegram_id=ref_id).update(ref_count=F("ref_count")+1)
            if updated:
                user.ref_id = ref_id
                user.save(update_fields=["ref_id"]) 

    request.session["user_id"] = user.telegram_id
    request.session["lang"] = user.lang_code

    return render(request, 'games/games.html')


@csrf_exempt
@require_POST
def change_lang(request):
    try:
        data = json.loads(request.body)
        lang = data.get('lang')
    except (json.JSONDecodeError, ValueError):
        lang = request.POST.get('lang')

    if not lang or lang not in ['ru', 'en']:
        raise BadRequest(f"Invalid lang value: {lang!r}")

    request.session['lang'] = lang

    user_id = request.session.get('user_id')
    if not user_id:
        raise BadRequest("user_id missing")

    TelegramUser.objects.filter(telegram_id=user_id).update(lang_code=lang)

    return profile(request)

@csrf_exempt
@require_POST
def check_subscription(request):
    try:
        data = json.loads(request.body)
        user_id = data.get("user_id")
        target = data.get("target")
    except json.JSONDecodeError:
        return JsonResponse({'status': 'error', 'message': 'Invalid JSON'}, status=400)

    if not user_id:
        return JsonResponse({'status': 'error', 'message': 'user_id missing'}, status=400)

    user = get_object_or_404(TelegramUser, telegram_id=user_id)

    if target == 'channel':
        if user.channel_sub_done:
            return JsonResponse({'status': 'error', 'message': 'The reward has already been received'})
        chat_id = settings.CHANNEL_ID
        
    elif target == 'chat':
        if user.chat_sub_done:
            return JsonResponse({'status': 'error', 'message': 'The reward has already been received'})
        chat_id = settings.CHAT_ID
    else:
        return JsonResponse({'status': 'error', 'message': 'Invalid target specified'}, status=400)

    url = f"https://api.telegram.org/bot{settings.MAIN_BOT_TOKEN}/getChatMember"
    params = {
        'chat_id': chat_id,
        'user_id': user_id
    }

    try:
        response = requests.get(url=url, params=params)
        tg_data = response.json()
    except requests.exceptions.RequestException:
        return JsonResponse({'status': 'error', 'message': 'Failed to connect to Telegram API'}, status=500)
    
    if tg_data.get('ok'):
        user_status = tg_data['result']['status']
        if user_status in ['member', 'administrator', 'creator']:
            user.balance += Decimal("0.05")
            
            if target == 'channel':
                user.channel_sub_done = True
            elif target == 'chat':
                user.chat_sub_done = True
                
            user.save(update_fields=['balance', 'channel_sub_done', 'chat_sub_done'])
            
            return JsonResponse({'status': 'success'})
        else:
            return JsonResponse({'status': 'not_subscribed'})
    else:
        error_desc = tg_data.get('description', 'Unknown Telegram API error')
        return JsonResponse({'status': 'error', 'message': error_desc}, status=500)


@csrf_exempt
@require_POST
def spin_case(request, case_slug):
    user_id = request.session.get("user_id")
    lang = request.session.get("lang")
    if not user_id or not lang:
        raise PermissionDenied("Session expired")

    try:
        data = json.loads(request.body)
        qty = data.get("qty")
        demo = data.get("demo")
        free = data.get("free")
        lucky_mode = data.get("lucky_mode")
        lucky_percent = data.get("lucky_percent")
    except (json.JSONDecodeError, ValueError):
        raise BadRequest("Incorrect data")

    case = get_object_or_404(Case, slug=case_slug, is_active=True)
    case_items = case.items.select_related('gift').all()

    results = []

    if free:
        user = get_object_or_404(TelegramUser, telegram_id=user_id)
        now = timezone.now()

        if user.last_free_case_at and now < user.last_free_case_at + timedelta(hours=24):
            return JsonResponse({'success': False, 'error': 'Кейс ещё не доступен'}, status=400)

        if not user.channel_sub_done:
            return JsonResponse({'success': False, 'error': 'Подпишись на канал'}, status=400)

        forward_ok = bool(
            user.last_forward_task_done_at and
            (not user.last_free_case_at or user.last_forward_task_done_at > user.last_free_case_at)
        )
        if not forward_ok:
            return JsonResponse({'success': False, 'error': 'Перешли сообщение друзьям'}, status=400)

        with transaction.atomic():
            inventory = get_object_or_404(Inventory, user=user)
            selected_gift = get_weighted_gift(case_items)

            inventory_item, created = InventoryItem.objects.get_or_create(
                inventory=inventory,
                gift=selected_gift,
                defaults={'amount': 1}
            )
            if not created:
                InventoryItem.objects.filter(pk=inventory_item.pk).update(amount=F('amount') + 1)

            CaseOpening.objects.create(
                user=user,
                case=case,
                gift=selected_gift
            )

            TelegramUser.objects.filter(telegram_id=user_id).update(
                last_free_case_at=now,
                total_cases=F("total_cases") + 1
            )
            user.refresh_from_db(fields=['balance'])

        results.append({
            "gift_name": selected_gift.name,
            "gift_id": selected_gift.id,
            "inventory_item_id": inventory_item.id,
            "lucky_won": True,
        })
        current_balance = user.balance

    elif demo:
        for _ in range(qty):
            selected_gift = get_weighted_gift(case_items)
            results.append({
                "gift_name": selected_gift.name,
                "gift_id": selected_gift.id,
                "inventory_item_id": None,
                "lucky_won": lucky_mode,
            })
        current_balance = TelegramUser.objects.get(telegram_id=user_id).balance

    else:
        with transaction.atomic():
            user = get_object_or_404(TelegramUser, telegram_id=user_id)
            inventory = get_object_or_404(Inventory, user=user)

            total_price = case.price * qty
            if lucky_mode:
                total_price = total_price * (Decimal(lucky_percent) / Decimal(100))
            if user.balance < total_price:
                return JsonResponse({'success': False, 'error': 'Недостаточно средств'}, status=400)

            total_turnover_add = Decimal('0')

            for _ in range(qty):
                selected_gift = get_weighted_gift(case_items)
                total_turnover_add += selected_gift.price

                lucky_won = True
                if lucky_mode:
                    roll = secrets.SystemRandom().uniform(0, 100)
                    lucky_won = roll <= lucky_percent

                inv_item_id = None
                if lucky_won:
                    inventory_item, created = InventoryItem.objects.get_or_create(
                        inventory=inventory,
                        gift=selected_gift,
                        defaults={'amount': 1}
                    )
                    if not created:
                        InventoryItem.objects.filter(pk=inventory_item.pk).update(amount=F('amount') + 1)
                    inv_item_id = inventory_item.id

                CaseOpening.objects.create(
                    user=user,
                    case=case,
                    gift=selected_gift
                )
                results.append({
                    "gift_name": selected_gift.name,
                    "gift_id": selected_gift.id,
                    "inventory_item_id": inv_item_id,
                    "lucky_won": lucky_won,
                })

            TelegramUser.objects.filter(telegram_id=user_id).update(
                balance=F("balance") - total_price,
                total_cases=F("total_cases") + qty,
                total_turnover=F("total_turnover") + total_price
            )

            LeaderboardPerMonth.objects.filter(user=user).update(
                earned=F("earned") + total_turnover_add,
                spent=F("spent") + total_price
            )

            user.refresh_from_db(fields=['balance'])
        current_balance = user.balance

    response_data = {
        "success": True,
        "results": results,
        "new_balance": str(current_balance)
    }
    return JsonResponse(response_data)


@csrf_exempt
@require_POST
def activate_promo(request):
    user_id = request.session.get("user_id")
    lang = request.session.get("lang")
    if not user_id or not lang:
        raise PermissionDenied("Session expired")

    try:
        data = json.loads(request.body)
        code = (data.get("code") or "").strip().upper()
    except (json.JSONDecodeError, ValueError):
        raise BadRequest("Incorrect data")

    if not code:
        return JsonResponse({'success': False, 'error': 'Введите промокод'}, status=400)

    user = get_object_or_404(TelegramUser, telegram_id=user_id)

    with transaction.atomic():
        promo = PromoCode.objects.select_for_update().select_related('case').filter(code=code).first()

        if not promo or not promo.is_active:
            return JsonResponse({'success': False, 'error': 'Промокод не найден'}, status=404)

        if promo.is_exhausted:
            return JsonResponse({'success': False, 'error': 'Активации промокода исчерпаны'}, status=400)

        if PromoCodeActivation.objects.filter(promo_code=promo, user=user).exists():
            return JsonResponse({'success': False, 'error': 'Вы уже активировали этот промокод'}, status=400)

        case_items = list(promo.case.items.select_related('gift').all())
        if not case_items:
            return JsonResponse({'success': False, 'error': 'Кейс промокода пуст'}, status=400)

        inventory = get_object_or_404(Inventory, user=user)
        selected_gift = get_weighted_gift(case_items)

        inventory_item, created = InventoryItem.objects.get_or_create(
            inventory=inventory,
            gift=selected_gift,
            defaults={'amount': 1}
        )
        if not created:
            InventoryItem.objects.filter(pk=inventory_item.pk).update(amount=F('amount') + 1)

        PromoCodeActivation.objects.create(
            promo_code=promo,
            user=user,
            gift=selected_gift
        )

        PromoCode.objects.filter(pk=promo.pk).update(activations_count=F('activations_count') + 1)

        CaseOpening.objects.create(
            user=user,
            case=promo.case,
            gift=selected_gift
        )

        TelegramUser.objects.filter(telegram_id=user_id).update(
            total_cases=F("total_cases") + 1
        )
        user.refresh_from_db(fields=['balance'])

    return JsonResponse({
        "success": True,
        "results": [{
            "gift_name": selected_gift.name,
            "gift_id": selected_gift.id,
            "inventory_item_id": inventory_item.id,
            "lucky_won": True,
        }],
        "case_items": [
            {
                "id": ci.gift.id,
                "name": ci.gift.name,
                "img": ci.gift.image_url,
                "price": str(ci.gift.price),
            }
            for ci in case_items
        ],
        "new_balance": str(user.balance),
    })


@csrf_exempt
@require_GET
def live_feed(request):
    openings = CaseOpening.objects.select_related('user', 'gift')[:10]

    data = [
        {
            "gift_img": o.gift.image_url
        }
        for o in openings
    ]

    return JsonResponse({'items': data})


@csrf_exempt
@require_POST
def sale_gift(request):
    user_id = request.session.get("user_id")
    lang = request.session.get("lang")
                    
    if not user_id or not lang:
        raise PermissionDenied("Session expired")

    try:
        data = json.loads(request.body)
        item_id = data.get("item_id")
    except (json.JSONDecodeError, ValueError):
        raise BadRequest("Incorrect data")

    with transaction.atomic():
        inv_item = InventoryItem.objects.select_for_update().filter(
            id=item_id,
            inventory__user__telegram_id=user_id 
        ).first()

        if inv_item is None:
            return JsonResponse({"error": "Item not found or not yours"}, status=404)

        price = inv_item.gift.price

        if inv_item.amount > 1:
            inv_item.amount -= 1
            inv_item.save()
        else:
            inv_item.delete()

        user = TelegramUser.objects.select_for_update().get(telegram_id=user_id)
        user.balance += price
        user.total_turnover += price
        user.save()

    return JsonResponse({"status": "ok"})


@csrf_exempt
@require_POST
def sale_all_gifts(request):
    user_id = request.session.get("user_id")
    lang = request.session.get("lang")
                        
    if not user_id or not lang:
        raise PermissionDenied("Session expired")

    with transaction.atomic():
        inv_item = InventoryItem.objects.select_for_update().filter(
            inventory__user__telegram_id=user_id 
        ).all()

        if inv_item is None:
            return JsonResponse({"error": "Item not found or not yours"}, status=404)

        price = 0

        for i in inv_item:
            price += i.gift.price * i.amount

        inv_item.delete()

        user = TelegramUser.objects.select_for_update().get(telegram_id=user_id)
        user.balance += price
        user.total_turnover += price
        user.save()
        
    return JsonResponse({"status": "ok"})


@csrf_exempt
@require_POST
def mark_forward_done(request):
    user_id = request.session.get("user_id")
    if not user_id:
        raise PermissionDenied("Session expired")

    TelegramUser.objects.filter(telegram_id=user_id).update(
        last_forward_task_done_at=timezone.now()
    )
    return JsonResponse({"ok": True})


@csrf_exempt
@require_POST
def check_free_case_tasks(request):
    user_id = request.session.get("user_id")
    if not user_id:
        raise PermissionDenied("Session expired")

    user = get_object_or_404(TelegramUser, telegram_id=user_id)

    if not user.channel_sub_done:
        try:
            response = requests.get(
                f"https://api.telegram.org/bot{settings.MAIN_BOT_TOKEN}/getChatMember",
                params={"chat_id": settings.CHANNEL_ID, "user_id": user_id},
                timeout=5,
            )
            result = response.json()
        except requests.exceptions.RequestException:
            result = {}
        if result.get("ok") and result["result"]["status"] in ("member", "administrator", "creator"):
            user.channel_sub_done = True
            user.save(update_fields=["channel_sub_done"])

    forward_done = bool(
        user.last_forward_task_done_at and
        (not user.last_free_case_at or user.last_forward_task_done_at > user.last_free_case_at)
    )

    return JsonResponse({
        "subscribed": user.channel_sub_done,
        "forwarded": forward_done,
    })


@csrf_exempt
@require_POST
def withdraw_gift(request):
    user_id = request.session.get("user_id")
    if not user_id:
        raise PermissionDenied("Session expired")

    try:
        data = json.loads(request.body)
        item_id = data.get("item_id")
    except (json.JSONDecodeError, ValueError):
        raise BadRequest("Incorrect data")

    if not item_id:
        raise BadRequest("item_id is required")

    with transaction.atomic():
        inv_item = InventoryItem.objects.select_for_update().filter(
            id=item_id,
            inventory__user__telegram_id=user_id
        ).first()

        if inv_item is None:
            return JsonResponse({"error": "Item not found or not yours"}, status=404)

        user = TelegramUser.objects.select_for_update().get(telegram_id=user_id)
        gift = inv_item.gift

        withdrawal = Withdrawals.objects.create(user=user, gift=gift)

        if inv_item.amount > 1:
            inv_item.amount -= 1
            inv_item.save()
        else:
            inv_item.delete()

    notify_admins_about_withdraw(withdrawal)

    return JsonResponse({"status": "ok", "withdrawal_id": withdrawal.id})