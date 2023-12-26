from rest_framework import serializers
from .models import Profile

class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profile
        fields = [
            'name',
            'email',
            'bank_amount', 
            'savings_amount',
            'picture'
            ]