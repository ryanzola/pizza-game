import json
import logging
import requests
import random
import time

from django.conf import settings
from django.http import JsonResponse
from rest_framework.response import Response
from django.core.exceptions import ObjectDoesNotExist
from django.core.serializers import serialize
from django.utils import timezone

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated

from openai import OpenAI

from .models import Address, Order
from .serializers import OrderSerializer

GOOGLE_API_KEY = settings.GOOGLE_API_KEY
OPENAI_API_KEY = settings.OPENAI_API_KEY

logger = logging.getLogger(__name__)

client = OpenAI(
    api_key=OPENAI_API_KEY,
)

assistant = client.beta.assistants.create(
    name="Pizzeria Order Assistant",
    instructions="""
    You work at a pizzeria, taking phone orders for delivery. 
    When provided with the number of people, list a unique and concise order without explanations or additional details. 
    Orders can be of any combination of appetizers, pizza, pasta, salad, drinks, and desserts. 
    Orders should be specific food items from these categories. 
    Include a quantity for each item in the order.
    Example order item: 1 large pepperoni pizza
    """,
    tools=[],
    model="gpt-4o-2024-08-06",
    response_format={
        "type": "json_schema",
        "json_schema": {
            "name": "pizza_order",
            "strict": True,
            "schema": {
                "type": "object",
                "properties": {
                    "order_items": {
                        "type": "array",
                        "items": {
                            "type": "string"
                        }
                    },
                    "total_cost": {
                        "type": "number"
                    },
                    "tip": {
                        "type": "number"
                    },
                },
                "required": ["order_items", "total_cost", "tip"],
                "additionalProperties": False
            },
        }
    }
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
        content=f"Please create an order for a family of {family_size} people.",
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

            print(run_status)

            if run_status.status == 'completed' or run_status.status == 'failed':
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
def get_orders(request):
    # Retrieve all orders
    all_orders = Order.objects.all()

    # Serialize the orders with the nested address data
    serialized_orders = OrderSerializer(all_orders, many=True).data

    return Response({'orders': serialized_orders})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def construct_order(request):
    try:
        address_obj = Address.objects.select_related('street__town').order_by('?').first()

        formatted_town_name = address_obj.street.town.name.replace('_', ' ')
        formatted_address = f"{address_obj.address} {address_obj.street.name}"
        lat, lon = get_lat_lon(formatted_address, formatted_town_name)

        family_size = random.randint(1, 6)
        new_order = get_random_order_from_openai(family_size)
        total_cost, tip = estimated_order_cost(family_size)

        order = Order(
            status='queued',
            date_delivered=None,
            user=None,
            address=address_obj,
            items=new_order.order_items,
            total_cost=total_cost,
            tip=tip,
            lat=lat,
            lon=lon,
        )

        order.save()
        print("Order created successfully.", order.id)

        order_serializer = OrderSerializer(order)

        return Response(order_serializer.data, status=200)
    
    except ObjectDoesNotExist:
        logger.error("Address object does not exist.", exc_info=True)
        return JsonResponse({"error": "No data available"}, status=400)

    except Exception as e:
        logger.error(f"Unexpected error in construct_order: {e}", exc_info=True)
        return JsonResponse({"error": str(e)}, status=500)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def attach_user_to_orders(request):
    try:
        user = request.user
        order_ids = request.data.get('order_ids', [])

        if not order_ids:
            return Response({'error': 'No order IDs provided'}, status=400)

        updated_orders = []
        for order_id in order_ids:
            try:
                order = Order.objects.get(id=order_id)
                order.user = user
                order.status = 'en_route'
                order.save()
                updated_orders.append(order_id)
            except ObjectDoesNotExist:
                logger.error(f"Order with id {order_id} does not exist.")
                continue

        return Response({'message': 'User attached to orders successfully', 'updated_orders': updated_orders}, status=200)
    except Exception as e:
        logger.error(f"Unexpected error in attach_user_to_orders: {e}", exc_info=True)
        return Response({"error": str(e)}, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_orders(request):
    try:
        user = request.user
        user_orders = Order.objects.filter(user=user)

        # Serialize the orders
        serialized_orders = OrderSerializer(user_orders, many=True).data

        return Response({'orders': serialized_orders}, status=200)
    except Exception as e:
        logger.error(f"Unexpected error in get_user_orders: {e}", exc_info=True)
        return Response({"error": str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def past_orders(request):
    # Retrieve the logged-in user's past orders
    user_past_orders = Order.objects.filter(user=request.user, status__in=['delivered', 'cancelled'])

    # Serialize the queryset to JSON and return it
    serialized_data = serialize('json', user_past_orders, fields=('id', 'time', 'status', 'total_cost', 'tip'))
    data = json.loads(serialized_data)

    return JsonResponse({'past_orders': data})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_order_status(request, order_id):
    try:
        order = Order.objects.get(id=order_id)
        new_status = request.data.get('status')

        # Validate the new status
        if new_status not in dict(Order.STATUS_CHOICES):
            return JsonResponse({'error': 'Invalid status value'}, status=400)

        # Attach the user if transitioning from 'queued' to 'en_route'
        if order.status == 'queued' and new_status == 'en_route':
            order.user = request.user

        # if transitioning from 'en_route' to 'delivered', set the date_delivered
        if order.status == 'en_route' and new_status == 'delivered':
            order.date_delivered = timezone.now()

            # add the tip to the user's bank_amount
            request.user.profile.bank_amount += order.tip

        order.status = new_status
        order.save()

        return JsonResponse({'message': 'Order status updated successfully'}, status=200)
    except ObjectDoesNotExist:
        return JsonResponse({'error': 'Order not found'}, status=404)
    except Exception as e:
        logger.error(f"Unexpected error in update_order_status: {e}", exc_info=True)
        return JsonResponse({"error": str(e)}, status=500)