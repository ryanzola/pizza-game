import logging
import os

from django.conf import settings
from django.contrib.auth.models import User

from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view
from rest_framework.response import Response

from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from .models import Profile
from .serializers import ProfileSerializer 

GOOGLE_API_KEY = settings.GOOGLE_API_KEY

logger = logging.getLogger(__name__)


@api_view(['POST'])
def google_login(request):
    token = request.data.get('token')
    CLIENT_ID = os.getenv('GOOGLE_CLIENT_ID')

    try:
        id_info = id_token.verify_firebase_token(token, google_requests.Request(), CLIENT_ID)

        # ID token is valid. Get the user's Google Account information
        user_id = id_info['sub']
        email = id_info['email']
        name = id_info['name']

        user = User.objects.filter(email=email).first()

        if not user:
            user = User.objects.create(username=email, email=email)
            user.save()

            # Create a Profile for the user
            profile = Profile.objects.create(user=user, name=name, bank_amount=0)
            profile.save()

        # fetch the profile associated with the user
        profile = Profile.objects.filter(user=user).first()
        profile_serializer = ProfileSerializer(profile)

        auth_token, created = Token.objects.get_or_create(user=user)

        return Response({'token': auth_token.key, 'profile': profile_serializer.data }, status=200)

    except ValueError:
        return Response({'error': 'Invalid Google ID token'}, status=400)
    except Exception as e:
        print(f"Google login error: {e}")
        return Response({'error': f'Google login error: {str(e)}'}, status=400)

@api_view(['GET'])
def get_bank_amount(request):
    user_id = request.data.get('user_id')
    user = User.objects.filter(id=user_id).first()
    profile = Profile.objects.filter(user=user).first()

    return Response({'bank_amount': profile.bank_amount}, status=200)

@api_view(['POST'])
def update_bank_amount(user_id, amount):
    user = User.objects.filter(id=user_id).first()
    profile = Profile.objects.filter(user=user).first()
    profile.bank_amount = amount
    profile.save()

    return profile.bank_amount

# set_savings is called when the user clicks the "Set Savings" button
# set_savings will take the current bank_amount and add it to the savings_amount
# set_savings will also set the bank_amount to 0
@api_view(['POST'])
def set_savings(request):
    user_id = request.data.get('user_id')
    user = User.objects.filter(id=user_id).first()
    profile = Profile.objects.filter(user=user).first()

    profile.savings_amount = profile.savings_amount + profile.bank_amount
    profile.bank_amount = 0
    profile.save()

    return Response({'savings_amount': profile.savings_amount}, status=200)