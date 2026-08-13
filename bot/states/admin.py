from aiogram.fsm.state import StatesGroup, State


class SendMessageState(StatesGroup):
    msg = State()
    picture = State()
    sticker = State()