from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton


admin_keyb = InlineKeyboardMarkup(inline_keyboard=[
    [InlineKeyboardButton(text="Отправить сообщение", callback_data="send_message_all")]
])

admin_confirmation_keyb = InlineKeyboardMarkup(inline_keyboard=[
    [InlineKeyboardButton(text="Отправить", callback_data="send_message_all_true")],
    [InlineKeyboardButton(text="Отменить", callback_data="send_message_all_false")]
])

send_msg_keyb = InlineKeyboardMarkup(inline_keyboard=[
    [InlineKeyboardButton(text="Открыть BlazeGift", url="https://t.me/BlazeGift_Bot?startapp")]
])