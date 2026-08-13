from django.db import models


class TelegramUser(models.Model):
    telegram_id = models.IntegerField(unique=True, db_index=True)
    name = models.CharField(max_length=550, null=False)
    username = models.CharField(max_length=100, null=True)
    balance = models.DecimalField(max_digits=20, decimal_places=9, default=0.00)
    is_admin = models.BooleanField(default=False, db_index=True)
    total_deposited = models.DecimalField(max_digits=20, decimal_places=2, default=0.00)
    total_turnover = models.DecimalField(max_digits=20, decimal_places=2, default=0.00)
    total_earned_from_referrals = models.DecimalField(max_digits=20, decimal_places=2, default=0.00)
    total_cases = models.IntegerField(default=0)
    ref_id = models.IntegerField(null=True, blank=True)
    ref_count = models.IntegerField(default=0)
    channel_sub_done = models.BooleanField(default=False)
    chat_sub_done = models.BooleanField(default=False)
    last_free_case_at = models.DateTimeField(null=True, blank=True)
    last_forward_task_done_at = models.DateTimeField(null=True, blank=True)
    lang_code = models.CharField(max_length=10, default="ru")
    
    is_banned = models.BooleanField(blank=True, default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-total_turnover']

    def __str__(self):
        return f"{self.username} ({self.telegram_id})"
    

class Inventory(models.Model):
    received_at = models.DateTimeField(auto_now_add=True)

    user = models.OneToOneField(to="TelegramUser", on_delete=models.CASCADE, related_name="inventory")

    def __str__(self):
        return f"{self.user.username} ({self.user.telegram_id})"


class Gift(models.Model):
    name = models.CharField(max_length=255)
    price = models.DecimalField(max_digits=20, decimal_places=2)
    image_url = models.URLField(max_length=500, default='')

    def __str__(self):
        return f"{self.name} ({self.price} TON)"
    

class InventoryItem(models.Model):
    inventory = models.ForeignKey(to="Inventory", on_delete=models.CASCADE, related_name="items")
    gift = models.ForeignKey(to="Gift", on_delete=models.CASCADE)

    amount = models.PositiveIntegerField(default=1)

    def __str__(self):
        return f"{self.inventory.user.username} ({self.inventory.user.telegram_id})"


class LeaderboardPerMonth(models.Model):
    user = models.OneToOneField(to="TelegramUser", on_delete=models.CASCADE, related_name="leaderboard_per_month")

    earned = models.DecimalField(max_digits=20, decimal_places=2, default=0.00)
    deposited = models.DecimalField(max_digits=20, decimal_places=2, default=0.00)
    spent = models.DecimalField(max_digits=20, decimal_places=2, default=0.00)

    def __str__(self):
        return f"{self.user.username} ({self.user.telegram_id})"