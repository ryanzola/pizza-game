import os
import django
import csv

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pizzaserver.settings')
django.setup()

from order.models import Town, Street, Address

def import_data_from_csv():
    directory = 'data'
    for filename in os.listdir(directory):
        if filename.endswith(".csv"):
            file_path = os.path.join(directory, filename)
            town_name = os.path.basename(file_path).replace('.csv', '')
            town, _ = Town.objects.get_or_create(name=town_name)
            
            with open(file_path, 'r') as csv_file:
                reader = csv.DictReader(csv_file)
                for row in reader:
                    street, _ = Street.objects.get_or_create(town=town, name=row['Street'])
                    for address_str in row['Address Range'].split(','):
                        Address.objects.get_or_create(street=street, address=address_str.strip())

if __name__ == "__main__":
    import_data_from_csv()