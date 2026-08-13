from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton


start_keyb = InlineKeyboardMarkup(inline_keyboard=[
    [InlineKeyboardButton(text="🎮 Играть", url="https://t.me/BlazeGift_Bot?startapp")],
    [InlineKeyboardButton(text="📢 Канал", url="https://t.me/BlazeGift_News"), InlineKeyboardButton(text="💬 Чат", url="https://t.me/BlazeGiftChat")],
    [InlineKeyboardButton(text="🏦 Банк", url="https://t.me/BlazeGift_bank"), InlineKeyboardButton(text="☎️ Поддержка", url="https://t.me/BlazeGiftAdmin")]
])