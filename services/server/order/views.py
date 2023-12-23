import json
import logging
import requests
import random
import time

from django.conf import settings
from django.http import JsonResponse
from django.core.exceptions import ObjectDoesNotExist
from django.core.serializers import serialize

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated

from openai import OpenAI

from .models import Address, Order

GOOGLE_API_KEY = settings.GOOGLE_API_KEY
OPENAI_API_KEY = settings.OPENAI_API_KEY

logger = logging.getLogger(__name__)

client = OpenAI(
    api_key=OPENAI_API_KEY,
)

assistant = client.beta.assistants.create(
    name="Pizzeria Order Assistant",
    instructions="""
    You work at a pizzeria. When provided with the number of people, list a unique and concise order without explanations or additional details. 
    Orders can be of any combination of appetizers, pizza, pasta, salad, drinks, and desserts. 
    Orders should be specific food items from these categories. 
    Include a quantity for each item in the order. 
    Format the response as a markdown list.
    """,
    tools=[],
    model="gpt-4-1106-preview"
)

thread = client.beta.threads.create()

def get_lat_lon(address, city, state="NJ"):  
    # Format the address
    full_address = f"{address}, {city}, {state}"
    formatted_address = '+'.join(full_address.split())
    
    google_url = f"https://maps.googleapis.com/maps/api/geocode/json?address={formatted_address}&key={GOOGLE_API_KEY}"
    
    try:
        response = requests.get(google_url, timeout=10)  # 10 seconds timeout
        response.raise_for_status()  # Will raise an HTTPError if the HTTP request returned an unsuccessful status code

        data = response.json()

        if data['status'] == "OK":
            lat = data['results'][0]['geometry']['location']['lat']
            lon = data['results'][0]['geometry']['location']['lng']
            return lat, lon
    except requests.RequestException as e:
        logger.error(f"Error fetching geocoding data: {e}")
        

    return None, None


def estimated_order_cost(family_size):
    cost_per_person = random.uniform(5, 15)
    cost_variance_coefficent = random.uniform(0.8, 1.2)
    tip_percentage = 0.10  # 10%
    # Estimate total based on average price per person
    total = cost_per_person * family_size * cost_variance_coefficent

    # Calculate 15% tip
    generosity_variance_coefficient = random.uniform(0.8, 1.2)
    tip = total * tip_percentage * generosity_variance_coefficient
    
    return total, tip


def get_random_order_from_openai(family_size):
    # Create user message
    message = client.beta.threads.messages.create(
        thread_id=thread.id,
        role="user",
        content=f"Please create an order for a family of {family_size} people."
    )

    try:
        # Trigger the assistant
        run = client.beta.threads.runs.create(
            thread_id=thread.id,
            assistant_id=assistant.id,
        )

        # Polling logic: Check the status of the run periodically until it's completed
        while True:
            run_status = client.beta.threads.runs.retrieve(
                thread_id=thread.id,
                run_id=run.id
            )

            print(run_status.status)

            if run_status.status == 'completed':
                break

            time.sleep(1)  # Wait for 2 seconds before checking again

        # Retrieve the assistant's response after the run is completed
        messages = client.beta.threads.messages.list(thread_id=thread.id)

        # Filter out assistant's messages and retrieve the most recent one
        assistant_messages = [msg.content[0].text.value for msg in messages.data if msg.role == 'assistant']
        latest_response = assistant_messages[0] if assistant_messages else None

        return latest_response

    except Exception as e:
        logger.error(f"Error fetching order from OpenAI: {e}")
        return None


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def construct_order(request):
    try:
        address_obj = Address.objects.select_related('street__town').order_by('?').first()

        formatted_town_name = address_obj.street.town.name.replace('_', ' ')
        formatted_address = f"{address_obj.address} {address_obj.street.name}"
        lat, lon = get_lat_lon(formatted_address, formatted_town_name)

        family_size = random.randint(1, 6)
        items = get_random_order_from_openai(family_size)
        total_cost, tip = estimated_order_cost(family_size)

        return JsonResponse({
            'town': formatted_town_name,
            'street': address_obj.street.name,
            'address': address_obj.address,
            'latitude': lat,
            'longitude': lon,
            'items': items,
            'total_cost': total_cost,
            'tip': tip
        })
    except ObjectDoesNotExist:
        logger.error("Address object does not exist.", exc_info=True)
        return JsonResponse({"error": "No data available"}, status=400)

    except Exception as e:
        logger.error(f"Unexpected error in construct_order: {e}", exc_info=True)
        return JsonResponse({"error": str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def past_orders(request):
    # Retrieve the logged-in user's past orders
    user_past_orders = Order.objects.filter(user=request.user, status__in=['delivered', 'cancelled'])

    # Serialize the queryset to JSON and return it
    serialized_data = serialize('json', user_past_orders, fields=('id', 'time', 'status', 'total_cost', 'tip'))
    data = json.loads(serialized_data)

    return JsonResponse({'past_orders': data})

