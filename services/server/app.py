import random
import pandas as pd
import requests

def generate_orders(num_orders):
  # load csv data
  df = pd.read_csv("data/hasbrouck_heights.csv")

  # Shuffle the dataframe rows
  df = df.sample(frac=1).reset_index(drop=True)


  # Shuffle the dataframe rows
  df = df.sample(frac=1).reset_index(drop=True)

  # Initialize an empty list to store full address strings
  selected_addresses = []

  # Loop through the shuffled dataframe rows to select addresses
  for _, row in df.iterrows():
      # Check if the 'Address Range' is a string
      if isinstance(row['Address Range'], str):
          # Split the address range for the street and pick one random address
          address = random.choice(row['Address Range'].split(', '))
      
          # Combine address and street name, then add to the list
          full_address = f"{address} {row['Street']}"
          selected_addresses.append({ "name": full_address })
      
      # Break if we've got 6 addresses already
      if len(selected_addresses) == num_orders:
          break

  print(selected_addresses)

  return selected_addresses


addresses = generate_orders(4)


mapbox_token = "pk.eyJ1IjoicnlhbnpvbGEiLCJhIjoiY2xtbWVzbXFzMGhwYTJxbzQycGo5eDU0aiJ9.u1PNRlDfo3auXRoo7AtNYQ"

query = f"{addresses[0]}, Hasbrouck Heights, NJ 07604".replace(" ", "%20")

base_url = f"https://api.mapbox.com/search/geocode/v6/forward?q={query}&country=us&proximity=-73.990593%2C40.740121&types=address&language=en&access_token={mapbox_token}"

response = requests.get(base_url)

for address in addresses:
    query = f"{address['name']}, Hasbrouck Heights, NJ 07604".replace(" ", "%20")
    base_url = f"https://api.mapbox.com/search/geocode/v6/forward?q={query}&country=us&proximity=-73.990593%2C40.740121&types=address&language=en&access_token={mapbox_token}"
    response = requests.get(base_url)
    if response.status_code == 200:
        data = response.json()  # Parse the response to JSON
        address["coordinates"] = data["features"][0]["geometry"]["coordinates"]
    else:
        print(f"Failed to retrieve data. Status code: {response.status_code}")

print(addresses)