from django.db import models

from users.models import Gift, TelegramUser


class Case(models.Model):
    name = models.CharField(max_length=200)
    slug = models.SlugField(unique=True)  
    price = models.DecimalField(max_digits=20, decimal_places=9)  
    image = models.ImageField(upload_to='cases/')
    tint_rgb = models.CharField(max_length=20)
    is_active = models.BooleanField(default=True) 
    order = models.PositiveIntegerField(default=0) 
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['order', 'id']

    def __str__(self):
        return self.name


class CaseItem(models.Model):
    case = models.ForeignKey(Case, on_delete=models.CASCADE, related_name='items')
    gift = models.ForeignKey(Gift, on_delete=models.CASCADE)
    weight = models.PositiveIntegerField(default=1)  

    class Meta:
        unique_together = ('case', 'gift')


class CaseOpening(models.Model):
    user = models.ForeignKey(TelegramUser, on_delete=models.CASCADE, related_name='openings')
    case = models.ForeignKey(Case, on_delete=models.CASCADE)
    gift = models.ForeignKey(Gift, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [models.Index(fields=['-created_at'])]


class PromoCode(models.Model):
    code = models.CharField(
        max_length=64,
        unique=True,
    )
    case = models.ForeignKey(
        Case,
        on_delete=models.CASCADE,
        related_name='promo_codes',
    )
    max_activations = models.PositiveIntegerField(
        default=1,
    )
    activations_count = models.PositiveIntegerField(default=0, editable=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.code} → {self.case.name}'

    def save(self, *args, **kwargs):
        self.code = self.code.strip().upper()
        super().save(*args, **kwargs)

    @property
    def is_exhausted(self):
        return self.max_activations != 0 and self.activations_count >= self.max_activations


class PromoCodeActivation(models.Model):
    promo_code = models.ForeignKey(PromoCode, on_delete=models.CASCADE, related_name='activations')
    user = models.ForeignKey(TelegramUser, on_delete=models.CASCADE, related_name='promo_activations')
    gift = models.ForeignKey(Gift, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        unique_together = ('promo_code', 'user')

    def __str__(self):
        return f'{self.user.username} → {self.promo_code.code}'