from aiogram import Router, F
from aiogram.types import Message, CallbackQuery
from aiogram.filters import Command
from aiogram.fsm.context import FSMContext
from asgiref.sync import sync_to_async
from django.db import transaction
from django.db.models import F as DjangoF

from ..filters.admin import AdminFilter
from ..keyboards.admin import admin_keyb, admin_confirmation_keyb, send_msg_keyb
from ..states.admin import SendMessageState
from users.models import TelegramUser, Inventory, InventoryItem
from api.models import Withdrawals



admin_router = Router()


@admin_router.message(Command("admin"), AdminFilter())
async def admin_panel_handl(message: Message):
    try:
        await message.answer("""    
🛡 <b>АДМИН ПАНЕЛЬ</b> 🛡

Выберите нужную опцию:
""",
            parse_mode="HTML",
            reply_markup=admin_keyb
        )
    except Exception:
        pass


@admin_router.callback_query(F.data == "send_message_all")
async def admin_sendmsg_callb(callback: CallbackQuery, state: FSMContext):
    await state.set_state(SendMessageState.msg)
    await callback.message.answer("Введите текст:\n\nЕсли не хотите отправлять текст, то напишите 'No' с учётом регистра")
    await callback.answer()


@admin_router.message(SendMessageState.msg)
async def get_msg(message: Message, state: FSMContext):
    if message.text != "No":
        await state.update_data(msg=message.text)
    else:
        await state.update_data(msg=None)

    await state.set_state(SendMessageState.picture)
    await message.answer("Отправьте фотографию:\n\nЕсли не хотите отправлять фотографию, то напишите 'No' с учётом регистра")


@admin_router.message(SendMessageState.picture)
async def get_picture(message: Message, state: FSMContext):
    if message.text != "No":
        try:
            photo = message.photo[-1]
        except Exception as e:
            await message.answer(f"Произошла ошибка:\n\n{e}")
            return 

        await state.update_data(picture=photo.file_id)
    else:
        await state.update_data(picture=None)

    await state.set_state(SendMessageState.sticker)
    await message.answer("Отправьте стикер:\n\nЕсли не хотите отправлять стикер, то напишите 'No' с учётом регистра")


@admin_router.message(SendMessageState.sticker)
async def get_sticker(message: Message, state: FSMContext):
    if message.text != "No":
        try:
            await state.update_data(sticker=message.sticker.file_id)
        except Exception as e:
            await message.answer(f"Произошла ошибка:\n\n{e}")
            return 
        
        data = await state.get_data()

        await message.answer_sticker(sticker=data["sticker"], reply_markup=admin_confirmation_keyb)
        return 

    data = await state.get_data()

    if data.get("picture"):
        await message.answer_photo(
            photo=data.get("picture"),
            caption=data.get("msg"),
            parse_mode="HTML",
            reply_markup=admin_confirmation_keyb
        )
        return 
    elif data.get("msg"):
        await message.answer(
            text=data.get("msg"),
            parse_mode="HTML",
            reply_markup=admin_confirmation_keyb
        )
        return

    await state.clear()
    await message.answer("Произошла ошибка")


@admin_router.callback_query(F.data == "send_message_all_true")
async def send_message_all_true(callback: CallbackQuery, state: FSMContext):
    data = await state.get_data()

    if data.get("picture"):
        async for user in TelegramUser.objects.aiterator():
            try:
                await callback.message.bot.send_photo(user.telegram_id, data.get("picture"), caption=data["msg"], parse_mode="HTML", reply_markup=send_msg_keyb)
            except Exception:
                pass
    elif data.get("msg"):
        async for user in TelegramUser.objects.aiterator():
            try:
                await callback.message.bot.send_message(user.telegram_id, data.get("msg"), parse_mode="HTML", reply_markup=send_msg_keyb)
            except Exception:
                pass
    else:
        async for user in TelegramUser.objects.aiterator():
            try:
                await callback.message.bot.send_sticker(user.telegram_id, data.get("sticker"), reply_markup=send_msg_keyb)
            except Exception:
                pass

    await state.clear()
    await callback.answer()


@admin_router.callback_query(F.data == "send_message_all_false")
async def send_message_all_false(callback: CallbackQuery, state: FSMContext):
    await state.clear()
    await callback.message.answer("Отправка сообщений отменена")
    await callback.answer()


@sync_to_async
def _process_withdraw_decision(withdraw_id: int, approve: bool):
    with transaction.atomic():
        wr = Withdrawals.objects.select_for_update().select_related("user", "gift").filter(id=withdraw_id).first()

        if wr is None or wr.status != Withdrawals.StatusChoices.PENDING:
            return None  

        wr.status = Withdrawals.StatusChoices.CLOSED if approve else Withdrawals.StatusChoices.REJECTED
        wr.save(update_fields=["status", "updated_at"])

        if not approve and wr.gift is not None and wr.user is not None:
            inventory, _ = Inventory.objects.get_or_create(user=wr.user)
            inv_item, created = InventoryItem.objects.get_or_create(
                inventory=inventory,
                gift=wr.gift,
                defaults={"amount": 1}
            )
            if not created:
                InventoryItem.objects.filter(pk=inv_item.pk).update(amount=DjangoF("amount") + 1)

        return wr


async def _handle_withdraw_decision(callback: CallbackQuery, approve: bool):
    try:
        withdraw_id = int(callback.data.split(":")[1])
    except (IndexError, ValueError):
        await callback.answer("Некорректные данные", show_alert=True)
        return

    wr = await _process_withdraw_decision(withdraw_id, approve)

    if wr is None:
        await callback.answer("Заявка уже обработана", show_alert=True)
        return

    status_text = "✅ Подтверждено" if approve else "❌ Отклонено"
    gift_name = wr.gift.name if wr.gift else "—"
    gift_price = wr.gift.price if wr.gift else "—"
    username = wr.user.username if wr.user else "—"
    telegram_id = wr.user.telegram_id if wr.user else None

    result_text = (
        "🎁 <b>Заявка на вывод</b>\n\n"
        f"Пользователь: @{username} (ID: {telegram_id})\n"
        f"Предмет: {gift_name}\n"
        f"Цена: {gift_price} TON\n"
        f"№ заявки: {wr.id}\n\n"
        f"Статус: <b>{status_text}</b>\n"
        f"Обработал: {callback.from_user.full_name}"
    )

    for ref in (wr.admin_messages or []):
        try:
            await callback.message.bot.edit_message_text(
                chat_id=ref["chat_id"],
                message_id=ref["message_id"],
                text=result_text,
                parse_mode="HTML",
            )
        except Exception:
            pass

    if telegram_id:
        try:
            if approve:
                user_text = (
                    f"🎉 <b>«{gift_name}» успешно выведен на ваш аккаунт!</b>\n\n"
                    "Заходите ещё в BlazeGift! 🔥"
                )
            else:
                user_text = (
                    f'<b>❌ Произошла ошибка при выводе предмета «{gift_name}»</b>\n\n'
                    "<blockquote>Ваш предмет возвращён в инвентарь</blockquote>"
                )
            await callback.message.bot.send_message(telegram_id, user_text, parse_mode="HTML")
        except Exception:
            pass

    await callback.answer("Готово")


@admin_router.callback_query(F.data.startswith("wd_approve:"), AdminFilter())
async def withdraw_approve(callback: CallbackQuery):
    await _handle_withdraw_decision(callback, approve=True)


@admin_router.callback_query(F.data.startswith("wd_reject:"), AdminFilter())
async def withdraw_reject(callback: CallbackQuery):
    await _handle_withdraw_decision(callback, approve=False)