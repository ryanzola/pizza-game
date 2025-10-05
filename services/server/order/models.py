from django.db import models
from django.contrib.auth.models import User
import json

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
        ('queued', 'Queued'),           # order is at the pizzeria waiting to be delivered
        ('en_route', 'En Route'),       # order is on its way to the customer
        ('delivered', 'Delivered'),     # order has been delivered to the customer
        ('cancelled', 'Cancelled'),     # order has been cancelled by the customer (after 30 minutes of no activity))
    ]

    id = models.AutoField(primary_key=True)
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='queued')
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_orders')
    date_placed = models.DateTimeField(auto_now_add=True)
    date_delivered = models.DateTimeField(null=True)
    address = models.ForeignKey(Address, on_delete=models.SET_NULL, null=True, blank=True)
    items = models.TextField(default='[]')  # Store items as JSON string
    total_cost = models.DecimalField(max_digits=6, decimal_places=2)
    tip = models.DecimalField(max_digits=6, decimal_places=2)
    lat = models.FloatField(default=0)
    lon = models.FloatField(default=0)

    def set_items(self, items):
        if isinstance(items, list):
            self.items = json.dumps(items)
        else:
            raise ValueError("Items must be a list of strings")

    def get_items(self):
        return json.loads(self.items)


class GameSession(models.Model):
    STATUS_CHOICES = [
        ("active", "Active"),
        ("ended", "Ended"),
        ("timeout", "Timeout"),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="game_sessions")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="active")
    started_at = models.DateTimeField(auto_now_add=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    # Tracks last time the user accepted new orders (attach from queued -> en_route)
    last_activity = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["user", "status"]),
        ]

    def __str__(self):
        return f"Session {self.id} for {self.user.username} ({self.status})"
