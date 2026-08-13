from aiogram import Bot, Dispatcher
from django.conf import settings

from .handlers.start import start_router
from .handlers.admin import admin_router


async def start():
    bot = Bot(settings.MAIN_BOT_TOKEN)
    dp = Dispatcher()

    dp.include_routers(start_router, admin_router)

    await dp.start_polling(bot)