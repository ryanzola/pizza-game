from django.db import models
from django.contrib.auth.models import User

class Town(models.Model):
    name = models.CharField(max_length=200)

    def __str__(self):
        return self.name

class Street(models.Model):
    town = models.ForeignKey(Town, on_delete=models.CASCADE)
    name = models.CharField(max_length=200)

    def __str__(self):
        return self.name

class Address(models.Model):
    street = models.ForeignKey(Street, on_delete=models.CASCADE)
    address = models.CharField(max_length=100)

    def __str__(self):
        return self.address + " " + self.street.name

# order will be added to a queue. A user will be able to select an order from the queue and complete it.
# The order will be removed from the queue and added to the user's past orders upon successful completion
# or time expiration and customer cancellation. order will be created with user being null
class Order(models.Model):
    STATUS_CHOICES = [
        ('queued', 'Queued'),
        ('ready', 'Ready'),
        ('delivered', 'Delivered'),
        ('cancelled', 'Cancelled'),
    ]

    id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_orders')
    time = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='queued')
    time_to_complete = models.DateTimeField(null=True)
    address = models.ForeignKey(Address, on_delete=models.SET_NULL, null=True, blank=True)
    items = models.CharField(max_length=1024)
    total_cost = models.DecimalField(max_digits=6, decimal_places=2)
    tip = models.DecimalField(max_digits=6, decimal_places=2)
    lat = models.FloatField(default=0)
    lon = models.FloatField(default=0)
