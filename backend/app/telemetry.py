import random
from typing import List, Dict, Any
from datetime import datetime

WEEKDAY_ROUTES = ["LX", "B", "A", "H", "F", "EE", "REXB", "REXL"]
WEEKEND_ROUTES = ["Weekend 1", "Weekend 2"]

def is_weekend() -> bool:
    """Returns True if today is Saturday or Sunday."""
    # datetime.weekday(): Monday is 0, Sunday is 6
    return datetime.now().weekday() >= 5

def get_simulated_telemetry(route_filter: str = None) -> List[Dict[str, Any]]:
    """
    Returns realistic schedule-aware mock telemetry when live transit APIs are down or rate limited.
    Accurately recognizes weekend vs. weekday schedules!
    """
    now = datetime.now()
    weekend = is_weekend()

    if weekend:
        # On weekends, Rutgers runs Weekend 1 and Weekend 2 across all campuses
        buses = [
            {
                "id": "wknd-101",
                "route": "Weekend 1",
                "destination": "Busch / Livingston / College Ave / Cook",
                "lat": 40.5233,
                "lon": -74.4586,
                "speed_mph": 24,
                "occupancy": "Seats Available",
                "eta_mins": 5,
                "next_stop": "Busch Student Center"
            },
            {
                "id": "wknd-102",
                "route": "Weekend 1",
                "destination": "College Ave / Cook",
                "lat": 40.5028,
                "lon": -74.4518,
                "speed_mph": 20,
                "occupancy": "Standing Room Only",
                "eta_mins": 12,
                "next_stop": "The Yard"
            },
            {
                "id": "wknd-201",
                "route": "Weekend 2",
                "destination": "Cook / College Ave / Livingston / Busch",
                "lat": 40.4851,
                "lon": -74.4376,
                "speed_mph": 19,
                "occupancy": "Many Seats Available",
                "eta_mins": 7,
                "next_stop": "College Hall"
            },
            {
                "id": "wknd-202",
                "route": "Weekend 2",
                "destination": "Livingston / Busch",
                "lat": 40.5241,
                "lon": -74.4357,
                "speed_mph": 22,
                "occupancy": "Seats Available",
                "eta_mins": 14,
                "next_stop": "Livingston Student Center"
            }
        ]
    else:
        # Weekday schedule
        is_peak = (15 <= now.hour <= 18)
        buses = [
            {"id": "bus-101", "route": "LX", "destination": "Livingston", "lat": 40.5050, "lon": -74.4500, "speed_mph": 22, "occupancy": "Standing Room Only", "eta_mins": 3, "next_stop": "The Yard"},
            {"id": "bus-102", "route": "LX", "destination": "College Ave", "lat": 40.5220, "lon": -74.4360, "speed_mph": 18, "occupancy": "Seats Available", "eta_mins": 7, "next_stop": "Livingston Plaza"},
            {"id": "bus-201", "route": "B", "destination": "Busch", "lat": 40.5245, "lon": -74.4420, "speed_mph": 26, "occupancy": "Seats Available", "eta_mins": 4, "next_stop": "Hill Center"},
            {"id": "bus-301", "route": "A", "destination": "Busch", "lat": 40.5100, "lon": -74.4550, "speed_mph": 15, "occupancy": "Many Seats Available", "eta_mins": 5, "next_stop": "Busch Student Center"},
            {"id": "bus-401", "route": "F", "destination": "Cook/Douglass", "lat": 40.4950, "lon": -74.4440, "speed_mph": 12, "occupancy": "Full", "eta_mins": 8, "next_stop": "College Hall"},
            {"id": "bus-501", "route": "REXB", "destination": "Cook", "lat": 40.5180, "lon": -74.4600, "speed_mph": 28, "occupancy": "Seats Available", "eta_mins": 6, "next_stop": "Allison Road Classroom"}
        ]

    results = []
    for bus in buses:
        if route_filter and route_filter.upper() != "ALL":
            # Match route filter
            if route_filter.upper() not in bus["route"].upper():
                continue
        item = dict(bus)
        item["eta_mins"] = max(1, item["eta_mins"] + random.choice([-1, 0, 1]))
        item["traffic_condition"] = "Light / Weekend Traffic" if weekend else ("Heavy / Route 18 Bridge Congested" if (15 <= now.hour <= 18) else "Normal")
        results.append(item)
    return results
