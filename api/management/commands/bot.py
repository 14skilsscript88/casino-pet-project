from django.core.management.base import BaseCommand
import asyncio

from bot.main import start


class Command(BaseCommand):
    def handle(self, *args, **options):
        asyncio.run(start())