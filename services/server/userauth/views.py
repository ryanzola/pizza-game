import logging
import os

from django.conf import settings
from django.contrib.auth.models import User

from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view
from rest_framework.response import Response

from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

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

        # You might also want to get other information, such as name, etc.

        # Check if this user already exists in your database
        user = User.objects.filter(email=email).first()

        if not user:
            # Create a new user if not exist
            user = User.objects.create(username=email, email=email)
            user.save()

        # Create or get a token for this user
        auth_token, created = Token.objects.get_or_create(user=user)

        return Response({'token': auth_token.key}, status=200)

    except ValueError:
        # Invalid token
        return Response({'error': 'Invalid Google ID token'}, status=400)
    except Exception as e:
        print(f"Google login error: {e}")
        return Response({'error': f'Google login error: {str(e)}'}, status=400)
