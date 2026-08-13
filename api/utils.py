from django.conf import settings
import secrets
import requests
import uuid


def get_weighted_gift(case_items):
    total_weight = sum(item.weight for item in case_items)
    
    if total_weight <= 0:
        return case_items[0].gift if case_items else None

    random_value = secrets.SystemRandom().uniform(0, total_weight)
    
    current_sum = 0
    for item in case_items:
        current_sum += item.weight
        if random_value <= current_sum:
            return item.gift  
            
    return case_items[-1].gift


def get_share_message_id(user_id):
    payload = {
        "user_id": user_id,
        "result": {
            "type": "photo",
            "id": str(uuid.uuid4()),
            "photo_url": f"https://{settings.SITE_DOMAIN}/static/games/images/send-msg.png",
            "thumbnail_url": f"https://{settings.SITE_DOMAIN}/static/games/images/send-msg.png",
            "caption": (
                "<b>Хочешь NFT-подарок? 🎁</b>\n\n"
                "Тогда открывай бесплатный кейс каждые 24 часа!"
            ),
            "parse_mode": "HTML",
            "reply_markup": {
                "inline_keyboard": [[
                    {"text": "Открыть BlazeGift", "url": f"https://t.me/{(settings.BOT_USERNAME or '').lstrip('@')}?startapp"}
                ]]
            },
        },
        "allow_user_chats": True,
        "allow_group_chats": True,
        "allow_channel_chats": True,
    }

    try:
        response = requests.post(
            f"https://api.telegram.org/bot{settings.MAIN_BOT_TOKEN}/savePreparedInlineMessage",
            json=payload,
            timeout=5,
        )
        data = response.json()
    except (requests.RequestException, ValueError) as e:
        return None

    if not data.get("ok"):
        return None
    
    return data["result"]["id"]


def notify_admins_about_withdraw(withdrawal):
    from users.models import TelegramUser

    admin_ids = list(
        TelegramUser.objects.filter(is_admin=True).values_list("telegram_id", flat=True)
    )
    if not admin_ids:
        return

    gift = withdrawal.gift
    user = withdrawal.user

    text = (
        "🎁 <b>Новая заявка на вывод</b>\n\n"
        f"Пользователь: @{user.username} (ID: {user.telegram_id})\n"
        f"Предмет: {gift.name if gift else '—'}\n"
        f"Цена: {gift.price if gift else '—'} TON\n"
        f"№ заявки: {withdrawal.id}"
    )
    reply_markup = {
        "inline_keyboard": [[
            {"text": "✅ Подтвердить", "callback_data": f"wd_approve:{withdrawal.id}"},
            {"text": "❌ Отклонить", "callback_data": f"wd_reject:{withdrawal.id}"},
        ]]
    }

    sent_messages = []
    for admin_id in admin_ids:
        try:
            response = requests.post(
                f"https://api.telegram.org/bot{settings.MAIN_BOT_TOKEN}/sendMessage",
                json={
                    "chat_id": admin_id,
                    "text": text,
                    "parse_mode": "HTML",
                    "reply_markup": reply_markup,
                },
                timeout=5,
            )
            data = response.json()
        except (requests.RequestException, ValueError):
            continue

        if data.get("ok"):
            sent_messages.append({
                "chat_id": admin_id,
                "message_id": data["result"]["message_id"],
            })

    if sent_messages:
        withdrawal.admin_messages = sent_messages
        withdrawal.save(update_fields=["admin_messages"])