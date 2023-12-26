
from django.db import models
from django.contrib.auth.models import User

class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    email = models.CharField(max_length=200, blank=True, null=True)
    name = models.CharField(max_length=200, blank=True, null=True)
    bank_amount = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    savings_amount = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    picture = models.CharField(max_length=200, blank=True, null=True)

    def __str__(self):
        return self.user.first_name + ' ' + self.user.last_name