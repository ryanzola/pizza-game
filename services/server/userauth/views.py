import logging
import os

from django.conf import settings
from django.contrib.auth.models import User

from rest_framework.authtoken.models import Token
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import IsAuthenticated, AllowAny

from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from .models import Profile
from .serializers import ProfileSerializer 

GOOGLE_API_KEY = settings.GOOGLE_API_KEY

logger = logging.getLogger(__name__)


@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def google_login(request):
    token = request.data.get('token')
    CLIENT_ID = os.getenv('GOOGLE_CLIENT_ID')

    try:
        id_info = id_token.verify_firebase_token(token, google_requests.Request(), CLIENT_ID)

        # ID token is valid. Get the user's Google Account information
        user_id = id_info['sub']
        email = id_info['email']
        name = id_info['name']
        picture = id_info['picture']

        user = User.objects.filter(email=email).first()

        if not user:
            user = User.objects.create(username=email, email=email)
            user.save()

            # Create a Profile for the user
            profile = Profile.objects.create(
                user=user,
                email=email,
                name=name, 
                bank_amount=0,
                savings_amount=0,
                picture=picture,
            )
            profile.save()

        # fetch the profile associated with the user
        profile = Profile.objects.filter(user=user).first()
        profile_serializer = ProfileSerializer(profile)

        auth_token, created = Token.objects.get_or_create(user=user)

        return Response({'token': auth_token.key, 'user': profile_serializer.data }, status=200)

    except ValueError:
        return Response({'error': 'Invalid Google ID token'}, status=400)
    except Exception as e:
        print(f"Google login error: {e}")
        return Response({'error': f'Google login error: {str(e)}'}, status=400)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_bank(request):
    user = request.user
    profile = Profile.objects.filter(user=user).first()

    return Response(profile.bank_amount, status=200)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_bank(request, amount):
    user = request.user
    profile = Profile.objects.filter(user=user).first()
    profile.bank_amount += amount
    profile.save()

    return Response(profile.bank_amount, status=200)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_savings(request):
    user = request.user
    profile = Profile.objects.filter(user=user).first()

    return Response(profile.savings_amount, status=200)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_savings(request):
    user = request.user
    profile = Profile.objects.filter(user=user).first()

    # It's good to check if the profile exists
    if profile:
        profile.savings_amount += profile.bank_amount
        profile.bank_amount = 0
        profile.save()

        return Response(profile.savings_amount, status=200)
    else:
        # Handle the case where the profile doesn't exist
        return Response({"error": "Profile not found"}, status=404)