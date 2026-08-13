from aiogram import Router
from aiogram.types import Message, FSInputFile
from aiogram.filters import CommandStart
from django.conf import settings

from ..keyboards.start import start_keyb


start_router = Router()


@start_router.message(CommandStart())
async def start_handl(message: Message):
    try:
        await message.answer_photo(
            photo=FSInputFile(settings.BASE_DIR / "static" / "images" / "start_poster.png"),
            caption=f"""
<b>Привет, {message.from_user.first_name}</b> 👋
Добро пожаловать в BlazeGift!

<blockquote>🎁 Большое количество кейсов
🍀 Лучшие шансы в Telegram
🆓 Открывай бесплатный кейс каждый день
🏆 Играй и попади в таблицу лидеров</blockquote>

💸 Заходи и испытай удачу с нами!
""",
            parse_mode="HTML",
            reply_markup=start_keyb
        )
    except Exception:
        pass