python manage.py collectstatic --noinput
python manage.py migrate
gunicron pizzaserver.wsgi --bind 0.0.0.0:8005 --workers 4 --threads 4