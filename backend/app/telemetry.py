import random
from typing import List, Dict, Any
from datetime import datetime

ROUTES = ["LX", "B", "A", "H", "F", "EE", "REXB", "REXL"]

MOCK_BUSES = [
    {"id": "bus-101", "route": "LX", "destination": "Livingston", "lat": 40.5050, "lon": -74.4500, "speed_mph": 22, "occupancy": "Standing Room Only", "eta_mins": 3, "next_stop": "The Yard"},
    {"id": "bus-102", "route": "LX", "destination": "College Ave", "lat": 40.5220, "lon": -74.4360, "speed_mph": 18, "occupancy": "Seats Available", "eta_mins": 7, "next_stop": "Livingston Plaza"},
    {"id": "bus-201", "route": "B", "destination": "Busch", "lat": 40.5245, "lon": -74.4420, "speed_mph": 26, "occupancy": "Seats Available", "eta_mins": 4, "next_stop": "Hill Center"},
    {"id": "bus-301", "route": "A", "destination": "Busch", "lat": 40.5100, "lon": -74.4550, "speed_mph": 15, "occupancy": "Many Seats Available", "eta_mins": 5, "next_stop": "Busch Student Center"},
    {"id": "bus-401", "route": "F", "destination": "Cook/Douglass", "lat": 40.4950, "lon": -74.4440, "speed_mph": 12, "occupancy": "Full", "eta_mins": 8, "next_stop": "College Hall"},
    {"id": "bus-501", "route": "REXB", "destination": "Cook", "lat": 40.5180, "lon": -74.4600, "speed_mph": 28, "occupancy": "Seats Available", "eta_mins": 6, "next_stop": "Allison Road Classroom"}
]

def get_simulated_telemetry(route_filter: str = None) -> List[Dict[str, Any]]:
    """Returns resilient mock telemetry when live transit APIs are down or rate limited."""
    results = []
    now = datetime.now()
    # Peak traffic hours on Route 18: 3:00 PM to 6:30 PM
    is_peak = (15 <= now.hour <= 18)
    
    for bus in MOCK_BUSES:
        if route_filter and bus["route"].upper() != route_filter.upper():
            continue
        item = dict(bus)
        # Small dynamic perturbation to look alive in live demos
        item["eta_mins"] = max(1, item["eta_mins"] + random.choice([-1, 0, 1]))
        item["traffic_condition"] = "Heavy / Route 18 Bridge Congested" if is_peak else "Normal"
        results.append(item)
    return results
