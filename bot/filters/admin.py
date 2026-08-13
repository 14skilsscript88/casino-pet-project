from aiogram.filters import BaseFilter
from aiogram.types import Message

from users.models import TelegramUser


class AdminFilter(BaseFilter):
    async def __call__(self, message: Message):
        user = await TelegramUser.objects.filter(
            telegram_id=message.from_user.id
        ).afirst()

        return bool(user and user.is_admin)