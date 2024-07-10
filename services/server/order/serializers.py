from rest_framework import serializers
from .models import Order, Address, Street, Town

class OrderSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(source='user.id', read_only=True)
    address_name = serializers.SerializerMethodField()
    town = serializers.SerializerMethodField()
    latitude = serializers.FloatField(source='lat')
    longitude = serializers.FloatField(source='lon')

    class Meta:
        model = Order
        fields = ['id', 'date_placed', 'status', 'items', 'total_cost', 'tip', 'user_id', 'address_name', 'town', 'latitude', 'longitude']

    def get_address_name(self, obj):
        return f"{obj.address.address} {obj.address.street.name}"

    def get_town(self, obj):
        return obj.address.street.town.name.replace('_', ' ')

class AddressSerializer(serializers.ModelSerializer):
    street = serializers.StringRelatedField()
    class Meta:
        model = Address
        fields = ['address', 'street']

class StreetSerializer(serializers.ModelSerializer):
    town = serializers.StringRelatedField()
    class Meta:
        model = Street
        fields = ['name', 'town']

class TownSerializer(serializers.ModelSerializer):
    class Meta:
        model = Town
        fields = ['name']