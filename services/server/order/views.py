import json
import logging
import requests
import random
import time
import threading

from django.conf import settings
from django.http import JsonResponse
from rest_framework.response import Response
from django.core.exceptions import ObjectDoesNotExist
from django.core.serializers import serialize
from django.utils import timezone

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated

from openai import OpenAI

from .models import Address, Order, GameSession
from .serializers import OrderSerializer
from django.utils.dateparse import parse_datetime

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

# Keep track of spawner threads per active session
_SESSION_THREADS = {}

SESSION_INACTIVITY_MINUTES = 30

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

        return json.loads(latest_response)

    except Exception as e:
        logger.error(f"Error fetching order from OpenAI: {e}")
        return None


def spawn_random_order():
    """Create and persist a random order using the existing helpers."""
    address_obj = Address.objects.select_related('street__town').order_by('?').first()
    if not address_obj:
        return None

    formatted_town_name = address_obj.street.town.name.replace('_', ' ')
    formatted_address = f"{address_obj.address} {address_obj.street.name}"
    lat, lon = get_lat_lon(formatted_address, formatted_town_name)

    family_size = random.randint(1, 6)
    new_order = get_random_order_from_openai(family_size)
    if not new_order:
        return None

    total_cost, tip = estimated_order_cost(family_size)

    order = Order(
        status='queued',
        date_delivered=None,
        user=None,
        address=address_obj,
        total_cost=total_cost,
        tip=tip,
        lat=lat or 0,
        lon=lon or 0,
    )
    order.set_items(new_order['order_items'])
    order.save()
    return order


def _spawner_loop(session_id):
    """Background loop to spawn orders while a session remains active."""
    try:
        while True:
            try:
                session = GameSession.objects.get(id=session_id)
            except GameSession.DoesNotExist:
                break

            if session.status != 'active':
                break

            # Check inactivity timeout
            if session.last_activity and (timezone.now() - session.last_activity).total_seconds() > SESSION_INACTIVITY_MINUTES * 60:
                session.status = 'timeout'
                session.ended_at = timezone.now()
                session.save(update_fields=["status", "ended_at"])
                break

            # Spawn at random intervals
            delay = random.randint(20, 60)  # seconds
            time.sleep(delay)

            # Spawn a new order
            try:
                spawn_random_order()
            except Exception as e:
                logger.error(f"Order spawn error for session {session_id}: {e}")
                # keep loop running despite single failure

    finally:
        # Clean up thread reference
        _SESSION_THREADS.pop(session_id, None)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_orders(request):
    # Optional delta filter via ?since=<ISO8601>
    since_str = request.GET.get('since')
    qs = Order.objects.all()
    if since_str:
        dt = parse_datetime(since_str)
        if dt:
            qs = qs.filter(date_placed__gt=dt)

    qs = qs.order_by('date_placed')
    serialized_orders = OrderSerializer(qs, many=True).data
    return Response({'orders': serialized_orders})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def construct_order(request):
    try:
        order = spawn_random_order()
        if not order:
            return JsonResponse({"error": "Failed to create order"}, status=500)

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

        # Must have an active session to accept new orders
        active_session = GameSession.objects.filter(user=user, status='active').order_by('-started_at').first()
        if not active_session:
            # End any previously active sessions for this user just in case
            GameSession.objects.filter(user=user, status='active').update(status='ended', ended_at=timezone.now())

            active_session = GameSession.objects.create(user=user)

            # Start background spawner loop for this session
            t = threading.Thread(target=_spawner_loop, args=(active_session.id,), daemon=True)
            t.start()
            _SESSION_THREADS[active_session.id] = t

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

        # Update session last activity when orders are accepted
        if updated_orders:
            active_session.last_activity = timezone.now()
            active_session.save(update_fields=["last_activity"])

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
            # Bump last activity if there is an active session
            active_session = GameSession.objects.filter(user=request.user, status='active').order_by('-started_at').first()
            if active_session:
                active_session.last_activity = timezone.now()
                active_session.save(update_fields=["last_activity"])

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


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def start_session(request):
    try:
        user = request.user

        # End any previously active sessions for this user
        GameSession.objects.filter(user=user, status='active').update(status='ended', ended_at=timezone.now())

        session = GameSession.objects.create(user=user)

        # Start background spawner loop for this session
        t = threading.Thread(target=_spawner_loop, args=(session.id,), daemon=True)
        t.start()
        _SESSION_THREADS[session.id] = t

        return Response({
            'session_id': session.id,
            'status': session.status,
            'started_at': session.started_at,
            'ended_at': None,
            'note': 'Orders will begin spawning shortly.'
        }, status=200)
    except Exception as e:
        logger.error(f"Unexpected error in start_session: {e}", exc_info=True)
        return Response({"error": str(e)}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def end_session(request):
    try:
        user = request.user
        session = GameSession.objects.filter(user=user, status='active').order_by('-started_at').first()
        if not session:
            return Response({'message': 'No active session'}, status=200)

        session.status = 'ended'
        session.ended_at = timezone.now()
        session.save(update_fields=["status", "ended_at"])

        return Response({
            'session_id': session.id,
            'status': session.status,
            'started_at': session.started_at,
            'ended_at': session.ended_at,
            'note': 'Remaining accepted orders must still be completed.'
        }, status=200)
    except Exception as e:
        logger.error(f"Unexpected error in end_session: {e}", exc_info=True)
        return Response({"error": str(e)}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def clear_queued_orders(request):
    try:
        # Check if DEBUG is True
        if not settings.DEBUG:
            return JsonResponse({'error': 'This endpoint is only available in developer mode.'}, status=403)

        # Delete all orders with status 'queued'
        deleted_count, _ = Order.objects.filter(status='queued').delete()

        return JsonResponse({'message': f'Successfully cleared {deleted_count} queued orders.'}, status=200)

    except Exception as e:
        logger.error(f"Unexpected error in clear_queued_orders: {e}", exc_info=True)
        return JsonResponse({"error": str(e)}, status=500)
