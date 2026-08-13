from django.db import models

from users.models import TelegramUser, Gift


class Withdrawals(models.Model):
    class StatusChoices(models.TextChoices):
        PENDING = 'pending', 'Ожидает'
        CLOSED = 'closed', 'Закрыт'
        REJECTED = 'rejected', 'Отклонён'

    user = models.ForeignKey(TelegramUser, on_delete=models.SET_NULL, null=True, related_name="withdrawals")
    gift = models.ForeignKey(Gift, on_delete=models.SET_NULL, null=True, related_name="withdrawals")

    status = models.CharField(max_length=50, choices=StatusChoices, default=StatusChoices.PENDING)
    admin_messages = models.JSONField(default=list, blank=True) 

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
