from datetime import datetime
from typing import List, Dict, Any, Optional

def normalize_campus(campus: str) -> str:
    c = (campus or "").strip().lower()
    if "busch" in c:
        return "Busch"
    elif "livingston" in c:
        return "Livingston"
    elif "college" in c or "ave" in c:
        return "College Ave"
    elif "cook" in c or "douglass" in c:
        return "Cook/Douglass"
    return campus.strip()

def get_commute_routes(origin_raw: str, dest_raw: str, target_time: Optional[str] = None,
                       walking_speed_mph: float = 3.0, max_walk_miles: Optional[float] = None) -> List[Dict[str, Any]]:
    origin = normalize_campus(origin_raw)
    dest = normalize_campus(dest_raw)
    is_weekend = datetime.now().weekday() >= 5

    routes: List[Dict[str, Any]] = []

    # Case 1: Same campus
    if origin == dest:
        is_weekend = datetime.now().weekday() >= 5
        primary_bus = "Weekend 2" if is_weekend else ("Route B" if origin == "Busch" else "Route EE" if "college" in origin.lower() else "Route B")
        alt_bus = "Weekend 1" if is_weekend else ("Route A" if origin == "Busch" else "Route F")
        routes = [
            {
                "name": primary_bus,
                "type": "Campus Bus",
                "estimated_minutes": 5,
                "rush_hour_minutes": 7,
                "badge": "Recommended",
                "description": f"Direct campus bus connecting stops across {origin} (e.g. Student Center, Hill, Science, ARC)."
            },
            {
                "name": "Rutgers E-Scooter / Campus Bike",
                "type": "Bike / E-Scooter",
                "estimated_minutes": 3,
                "rush_hour_minutes": 4,
                "badge": "Fastest Active",
                "description": f"Hop on a Veo e-scooter or bike for the fastest cross-building transit on {origin}."
            },
            {
                "name": "Campus Pedestrian Walk",
                "type": "Walking Path",
                "estimated_minutes": 6,
                "walk_miles": 0.3,
                "rush_hour_minutes": 8,
                "badge": "Direct Walk",
                "description": f"Direct pedestrian walk between buildings on {origin}. No bus wait required."
            },
            {
                "name": alt_bus,
                "type": "Campus Bus",
                "estimated_minutes": 8,
                "rush_hour_minutes": 10,
                "badge": "Alternative Bus",
                "description": f"Secondary loop servicing internal stops across {origin}."
            }
        ]
        return routes

    # Route catalogs by campus pairs
    key = (origin, dest)

    if key == ("Busch", "College Ave"):
        if is_weekend:
            routes = [
                {
                    "name": "Weekend 2",
                    "type": "Direct Bus",
                    "estimated_minutes": 16,
                    "rush_hour_minutes": 19,
                    "badge": "Fastest Direct",
                    "description": "Clockwise loop running directly from Busch into College Ave (The Yard & Student Center)."
                },
                {
                    "name": "Rutgers E-Scooter / Bike",
                    "type": "Bike / E-Scooter",
                    "estimated_minutes": 17,
                    "rush_hour_minutes": 18,
                    "badge": "Active Commute",
                    "description": "Cross the Landing Lane Bridge and Johnson Park path straight into College Ave."
                },
                {
                    "name": "Knight Mover / Student Escort",
                    "type": "Campus Shuttle",
                    "estimated_minutes": 20,
                    "rush_hour_minutes": 24,
                    "badge": "On-Demand",
                    "description": "Request Rutgers Knight Mover for direct on-demand student center pickup."
                },
                {
                    "name": "Weekend 1 (Counter-Clockwise Loop)",
                    "type": "Alternative Loop",
                    "estimated_minutes": 26,
                    "rush_hour_minutes": 30,
                    "badge": "Full Loop",
                    "description": "Circles Busch -> Livingston -> Cook/Douglass -> College Ave. Reliable if Weekend 2 is full."
                },
                {
                    "name": "Pedestrian Walk via Landing Lane Bridge",
                    "type": "Walking Path",
                    "estimated_minutes": 32,
                    "walk_miles": 1.6,
                    "rush_hour_minutes": 32,
                    "badge": "Pedestrian",
                    "description": "Paved scenic sidewalk route across the Raritan River via Landing Lane into College Ave."
                }
            ]
        else:
            routes = [
                {
                    "name": "Route A (Direct Express)",
                    "type": "Direct Bus",
                    "estimated_minutes": 12,
                    "rush_hour_minutes": 18,
                    "badge": "Fastest Direct",
                    "description": "High-frequency express line connecting Busch (Hill Center / ARC) directly to College Ave."
                },
                {
                    "name": "Route H (Busch Loop)",
                    "type": "Direct Bus",
                    "estimated_minutes": 15,
                    "rush_hour_minutes": 22,
                    "badge": "Alternative Direct",
                    "description": "Circulates Busch residential and athletic sectors before proceeding straight to College Ave."
                },
                {
                    "name": "Rutgers E-Scooter / Bike",
                    "type": "Bike / E-Scooter",
                    "estimated_minutes": 17,
                    "rush_hour_minutes": 18,
                    "badge": "Active Commute",
                    "description": "Scenic bike route via Landing Lane Bridge, bypassing highway congestion."
                },
                {
                    "name": "Livingston Transfer (Route B + Route LX)",
                    "type": "Transfer Route",
                    "estimated_minutes": 25,
                    "rush_hour_minutes": 32,
                    "badge": "Transfer Connection",
                    "description": "Catch Route B to Livingston Student Center, then transfer to Route LX to College Ave."
                },
                {
                    "name": "Pedestrian Walk via Landing Lane Bridge",
                    "type": "Walking Path",
                    "estimated_minutes": 32,
                    "walk_miles": 1.6,
                    "rush_hour_minutes": 32,
                    "badge": "Pedestrian",
                    "description": "Direct pedestrian walk crossing Landing Lane into College Ave."
                }
            ]

    elif key == ("College Ave", "Busch"):
        if is_weekend:
            routes = [
                {
                    "name": "Weekend 1",
                    "type": "Direct Bus",
                    "estimated_minutes": 14,
                    "rush_hour_minutes": 18,
                    "badge": "Fastest Direct",
                    "description": "Direct weekend loop departing Scott Hall / Student Center into Busch (Hill Center & ARC)."
                },
                {
                    "name": "Rutgers E-Scooter / Bike",
                    "type": "Bike / E-Scooter",
                    "estimated_minutes": 17,
                    "rush_hour_minutes": 18,
                    "badge": "Active Commute",
                    "description": "Cross Landing Lane Bridge directly into Busch Campus."
                },
                {
                    "name": "Knight Mover / Student Escort",
                    "type": "Campus Shuttle",
                    "estimated_minutes": 20,
                    "rush_hour_minutes": 24,
                    "badge": "On-Demand",
                    "description": "On-demand student transit shuttle between College Ave and Busch."
                },
                {
                    "name": "Weekend 2 (Counter Loop)",
                    "type": "Alternative Loop",
                    "estimated_minutes": 28,
                    "rush_hour_minutes": 34,
                    "badge": "Full Loop",
                    "description": "Circles Cook/Douglass and Livingston first before arriving at Busch."
                },
                {
                    "name": "Pedestrian Walk via Landing Lane Bridge",
                    "type": "Walking Path",
                    "estimated_minutes": 32,
                    "walk_miles": 1.6,
                    "rush_hour_minutes": 32,
                    "badge": "Pedestrian",
                    "description": "Sidewalk route from College Ave across Landing Lane Bridge to Busch."
                }
            ]
        else:
            routes = [
                {
                    "name": "Route A (Direct Express)",
                    "type": "Direct Bus",
                    "estimated_minutes": 11,
                    "rush_hour_minutes": 16,
                    "badge": "Fastest Direct",
                    "description": "Direct express service from College Ave (Scott Hall / The Yard) to Busch Campus."
                },
                {
                    "name": "Route H",
                    "type": "Direct Bus",
                    "estimated_minutes": 14,
                    "rush_hour_minutes": 20,
                    "badge": "Alternative Direct",
                    "description": "Direct bus departing College Ave to Busch via Stadium West and ARC."
                },
                {
                    "name": "Rutgers E-Scooter / Bike",
                    "type": "Bike / E-Scooter",
                    "estimated_minutes": 17,
                    "rush_hour_minutes": 18,
                    "badge": "Active Commute",
                    "description": "Bike path via Landing Lane Bridge into Busch."
                },
                {
                    "name": "Livingston Transfer (Route LX + Route B)",
                    "type": "Transfer Route",
                    "estimated_minutes": 24,
                    "rush_hour_minutes": 30,
                    "badge": "Transfer Connection",
                    "description": "Board Route LX to Livingston Student Center, then transfer to Route B to Busch."
                },
                {
                    "name": "Pedestrian Walk via Landing Lane Bridge",
                    "type": "Walking Path",
                    "estimated_minutes": 32,
                    "walk_miles": 1.6,
                    "rush_hour_minutes": 32,
                    "badge": "Pedestrian",
                    "description": "Sidewalk route across Landing Lane Bridge."
                }
            ]

    elif key == ("Busch", "Livingston"):
        if is_weekend:
            routes = [
                {
                    "name": "Weekend 1 (Direct Hop)",
                    "type": "Direct Bus",
                    "estimated_minutes": 7,
                    "rush_hour_minutes": 10,
                    "badge": "Fastest Direct",
                    "description": "Direct short connection departing Busch into Livingston Plaza and Student Center."
                },
                {
                    "name": "E-Scooter / Bike via Cedar Lane",
                    "type": "Bike / E-Scooter",
                    "estimated_minutes": 8,
                    "rush_hour_minutes": 9,
                    "badge": "Fastest Active",
                    "description": "Paved dedicated multi-use bike path along Cedar Lane directly into Livingston."
                },
                {
                    "name": "Walking Path via Cedar Lane",
                    "type": "Walking Path",
                    "estimated_minutes": 20,
                    "walk_miles": 1.0,
                    "rush_hour_minutes": 20,
                    "badge": "Pedestrian",
                    "description": "Direct flat 1-mile sidewalk between Busch and Livingston campus centers."
                },
                {
                    "name": "Weekend 2 (Reverse Campus Loop)",
                    "type": "Alternative Loop",
                    "estimated_minutes": 34,
                    "rush_hour_minutes": 40,
                    "badge": "Full Loop",
                    "description": "Traverses College Ave and Cook/Douglass before returning to Livingston."
                }
            ]
        else:
            routes = [
                {
                    "name": "Route B (Direct Campus Connector)",
                    "type": "Direct Bus",
                    "estimated_minutes": 7,
                    "rush_hour_minutes": 12,
                    "badge": "Fastest Direct",
                    "description": "Dedicated direct shuttle between Busch (Hill Center / Science Buildings) and Livingston."
                },
                {
                    "name": "E-Scooter / Bike via Cedar Lane",
                    "type": "Bike / E-Scooter",
                    "estimated_minutes": 8,
                    "rush_hour_minutes": 9,
                    "badge": "Fastest Active",
                    "description": "Fast paved trail along Cedar Lane, avoiding all bus stops and traffic."
                },
                {
                    "name": "Walking Path via Cedar Lane",
                    "type": "Walking Path",
                    "estimated_minutes": 20,
                    "walk_miles": 1.0,
                    "rush_hour_minutes": 20,
                    "badge": "Pedestrian",
                    "description": "Straightforward 1-mile pedestrian sidewalk connecting Busch and Livingston."
                },
                {
                    "name": "Transfer via College Ave (Route A + Route LX)",
                    "type": "Transfer Route",
                    "estimated_minutes": 26,
                    "rush_hour_minutes": 34,
                    "badge": "Transfer Connection",
                    "description": "Backup route during Route B delays: Route A to College Ave, transfer to Route LX."
                }
            ]

    elif key == ("Livingston", "Busch"):
        if is_weekend:
            routes = [
                {
                    "name": "Weekend 2 (Direct Hop)",
                    "type": "Direct Bus",
                    "estimated_minutes": 7,
                    "rush_hour_minutes": 10,
                    "badge": "Fastest Direct",
                    "description": "Direct short connection departing Livingston Student Center straight into Busch."
                },
                {
                    "name": "E-Scooter / Bike via Cedar Lane",
                    "type": "Bike / E-Scooter",
                    "estimated_minutes": 8,
                    "rush_hour_minutes": 9,
                    "badge": "Fastest Active",
                    "description": "Paved bike trail along Cedar Lane directly into Busch Campus."
                },
                {
                    "name": "Walking Path via Cedar Lane",
                    "type": "Walking Path",
                    "estimated_minutes": 20,
                    "walk_miles": 1.0,
                    "rush_hour_minutes": 20,
                    "badge": "Pedestrian",
                    "description": "Direct 1-mile pedestrian sidewalk from Livingston into Busch."
                },
                {
                    "name": "Weekend 1 (Reverse Campus Loop)",
                    "type": "Alternative Loop",
                    "estimated_minutes": 34,
                    "rush_hour_minutes": 40,
                    "badge": "Full Loop",
                    "description": "Full loop via Cook/Douglass and College Ave before arriving at Busch."
                }
            ]
        else:
            routes = [
                {
                    "name": "Route B (Direct Campus Connector)",
                    "type": "Direct Bus",
                    "estimated_minutes": 7,
                    "rush_hour_minutes": 12,
                    "badge": "Fastest Direct",
                    "description": "Dedicated direct connection from Livingston Student Center/Plaza to Busch Campus."
                },
                {
                    "name": "E-Scooter / Bike via Cedar Lane",
                    "type": "Bike / E-Scooter",
                    "estimated_minutes": 8,
                    "rush_hour_minutes": 9,
                    "badge": "Fastest Active",
                    "description": "Quick 8-minute bike commute along Cedar Lane directly into Busch."
                },
                {
                    "name": "Walking Path via Cedar Lane",
                    "type": "Walking Path",
                    "estimated_minutes": 20,
                    "walk_miles": 1.0,
                    "rush_hour_minutes": 20,
                    "badge": "Pedestrian",
                    "description": "Safe sidewalk connection between Livingston and Busch."
                },
                {
                    "name": "Transfer via College Ave (Route LX + Route H)",
                    "type": "Transfer Route",
                    "estimated_minutes": 26,
                    "rush_hour_minutes": 34,
                    "badge": "Transfer Connection",
                    "description": "Alternative connection: Route LX to College Ave, transfer to Route H to Busch."
                }
            ]

    elif key == ("College Ave", "Livingston"):
        if is_weekend:
            routes = [
                {
                    "name": "Weekend 1 (via Busch)",
                    "type": "Direct Bus",
                    "estimated_minutes": 18,
                    "rush_hour_minutes": 22,
                    "badge": "Fastest Direct",
                    "description": "Loops from College Ave through Busch directly into Livingston Student Center."
                },
                {
                    "name": "Knight Mover Shuttle",
                    "type": "Campus Shuttle",
                    "estimated_minutes": 18,
                    "rush_hour_minutes": 22,
                    "badge": "On-Demand",
                    "description": "On-demand student escort shuttle between College Ave and Livingston."
                },
                {
                    "name": "Rutgers E-Scooter / Bike",
                    "type": "Bike / E-Scooter",
                    "estimated_minutes": 22,
                    "rush_hour_minutes": 24,
                    "badge": "Active Commute",
                    "description": "Bike path via Landing Lane and Avenue E directly onto Livingston Campus."
                },
                {
                    "name": "Weekend 2 (via Cook/Douglass)",
                    "type": "Alternative Loop",
                    "estimated_minutes": 26,
                    "rush_hour_minutes": 32,
                    "badge": "Alternative Loop",
                    "description": "Circles Cook/Douglass first before heading to Livingston."
                },
                {
                    "name": "Pedestrian Walking Route",
                    "type": "Walking Path",
                    "estimated_minutes": 42,
                    "walk_miles": 2.1,
                    "rush_hour_minutes": 42,
                    "badge": "Pedestrian",
                    "description": "Walking path along River Road and Avenue E corridor."
                }
            ]
        else:
            routes = [
                {
                    "name": "Route LX (Direct Express via Route 18)",
                    "type": "Direct Bus",
                    "estimated_minutes": 10,
                    "rush_hour_minutes": 20,
                    "badge": "Fastest Direct",
                    "description": "High-frequency express bus connecting College Ave directly to Livingston Plaza & Student Center."
                },
                {
                    "name": "Transfer via Busch (Route A + Route B)",
                    "type": "Transfer Route",
                    "estimated_minutes": 22,
                    "rush_hour_minutes": 28,
                    "badge": "Transfer Connection",
                    "description": "Avoid Route LX queues at peak hours: take Route A to Hill Center, then Route B to Livingston."
                },
                {
                    "name": "Rutgers E-Scooter / Bike",
                    "type": "Bike / E-Scooter",
                    "estimated_minutes": 22,
                    "rush_hour_minutes": 24,
                    "badge": "Active Commute",
                    "description": "Dedicated bike path via Landing Lane and Avenue E to Livingston Campus."
                },
                {
                    "name": "Pedestrian Walking Route",
                    "type": "Walking Path",
                    "estimated_minutes": 42,
                    "walk_miles": 2.1,
                    "rush_hour_minutes": 42,
                    "badge": "Pedestrian",
                    "description": "Long sidewalk route through Landing Lane and Avenue E."
                }
            ]

    elif key == ("Livingston", "College Ave"):
        if is_weekend:
            routes = [
                {
                    "name": "Weekend 2 (via Busch)",
                    "type": "Direct Bus",
                    "estimated_minutes": 18,
                    "rush_hour_minutes": 22,
                    "badge": "Fastest Direct",
                    "description": "Loops from Livingston through Busch directly into College Ave (The Yard & Scott Hall)."
                },
                {
                    "name": "Knight Mover Shuttle",
                    "type": "Campus Shuttle",
                    "estimated_minutes": 18,
                    "rush_hour_minutes": 22,
                    "badge": "On-Demand",
                    "description": "On-demand student escort shuttle between Livingston and College Ave."
                },
                {
                    "name": "Rutgers E-Scooter / Bike",
                    "type": "Bike / E-Scooter",
                    "estimated_minutes": 22,
                    "rush_hour_minutes": 24,
                    "badge": "Active Commute",
                    "description": "Bike ride down Avenue E and across Landing Lane Bridge into College Ave."
                },
                {
                    "name": "Weekend 1 (via Cook/Douglass)",
                    "type": "Alternative Loop",
                    "estimated_minutes": 25,
                    "rush_hour_minutes": 30,
                    "badge": "Alternative Loop",
                    "description": "Circles Cook/Douglass before proceeding to College Ave."
                },
                {
                    "name": "Pedestrian Walking Route",
                    "type": "Walking Path",
                    "estimated_minutes": 42,
                    "walk_miles": 2.1,
                    "rush_hour_minutes": 42,
                    "badge": "Pedestrian",
                    "description": "Sidewalk route via Avenue E and Landing Lane Bridge."
                }
            ]
        else:
            routes = [
                {
                    "name": "Route LX (Direct Express via Route 18)",
                    "type": "Direct Bus",
                    "estimated_minutes": 10,
                    "rush_hour_minutes": 18,
                    "badge": "Fastest Direct",
                    "description": "Fastest express connection from Livingston Student Center/Plaza to Scott Hall & The Yard."
                },
                {
                    "name": "Transfer via Busch (Route B + Route H)",
                    "type": "Transfer Route",
                    "estimated_minutes": 22,
                    "rush_hour_minutes": 28,
                    "badge": "Transfer Connection",
                    "description": "If Route LX has long boarding lines: Route B to Busch, transfer to Route H to College Ave."
                },
                {
                    "name": "Rutgers E-Scooter / Bike",
                    "type": "Bike / E-Scooter",
                    "estimated_minutes": 22,
                    "rush_hour_minutes": 24,
                    "badge": "Active Commute",
                    "description": "Bike commute through Avenue E and Landing Lane, avoiding Route 18 rush hour traffic."
                },
                {
                    "name": "Pedestrian Walking Route",
                    "type": "Walking Path",
                    "estimated_minutes": 42,
                    "walk_miles": 2.1,
                    "rush_hour_minutes": 42,
                    "badge": "Pedestrian",
                    "description": "Sidewalk route from Livingston into College Ave."
                }
            ]

    elif key == ("College Ave", "Cook/Douglass"):
        if is_weekend:
            routes = [
                {
                    "name": "Weekend 2",
                    "type": "Direct Bus",
                    "estimated_minutes": 12,
                    "rush_hour_minutes": 16,
                    "badge": "Fastest Direct",
                    "description": "Direct bus departing College Ave (The Yard / Student Center) into Cook/Douglass."
                },
                {
                    "name": "Rutgers E-Scooter / Bike",
                    "type": "Bike / E-Scooter",
                    "estimated_minutes": 11,
                    "rush_hour_minutes": 12,
                    "badge": "Active Commute",
                    "description": "Direct bike lane ride down George Street from College Ave to Cook/Douglass."
                },
                {
                    "name": "Knight Mover / Escort",
                    "type": "Campus Shuttle",
                    "estimated_minutes": 15,
                    "rush_hour_minutes": 18,
                    "badge": "On-Demand",
                    "description": "Rutgers on-demand student transit between campus hubs."
                },
                {
                    "name": "Walking Path down George Street",
                    "type": "Walking Path",
                    "estimated_minutes": 22,
                    "walk_miles": 1.1,
                    "rush_hour_minutes": 22,
                    "badge": "Pedestrian",
                    "description": "Direct walk along George Street through Downtown New Brunswick into Douglass."
                },
                {
                    "name": "Weekend 1 (Full Reverse Loop)",
                    "type": "Alternative Loop",
                    "estimated_minutes": 28,
                    "rush_hour_minutes": 34,
                    "badge": "Full Loop",
                    "description": "Loops Busch and Livingston before arriving at Cook/Douglass."
                }
            ]
        else:
            routes = [
                {
                    "name": "Route F (Express via Route 18)",
                    "type": "Direct Bus",
                    "estimated_minutes": 10,
                    "rush_hour_minutes": 18,
                    "badge": "Fastest Direct",
                    "description": "Express bus connecting College Ave directly to College Hall, Red Oak Lane & Biel Road."
                },
                {
                    "name": "Rutgers E-Scooter / Bike",
                    "type": "Bike / E-Scooter",
                    "estimated_minutes": 11,
                    "rush_hour_minutes": 12,
                    "badge": "Active Commute",
                    "description": "Direct bike ride down George Street, often faster than buses in heavy traffic."
                },
                {
                    "name": "Route EE (Local via Downtown George St)",
                    "type": "Direct Bus",
                    "estimated_minutes": 16,
                    "rush_hour_minutes": 24,
                    "badge": "Alternative Direct",
                    "description": "Local route serving downtown New Brunswick and Paterson Street before reaching Douglass."
                },
                {
                    "name": "Walking Path down George Street",
                    "type": "Walking Path",
                    "estimated_minutes": 22,
                    "walk_miles": 1.1,
                    "rush_hour_minutes": 22,
                    "badge": "Pedestrian",
                    "description": "Direct sidewalk through downtown New Brunswick into Douglass Campus."
                }
            ]

    elif key == ("Cook/Douglass", "College Ave"):
        if is_weekend:
            routes = [
                {
                    "name": "Weekend 1",
                    "type": "Direct Bus",
                    "estimated_minutes": 12,
                    "rush_hour_minutes": 16,
                    "badge": "Fastest Direct",
                    "description": "Direct weekend bus from Cook/Douglass straight into College Ave (Scott Hall & The Yard)."
                },
                {
                    "name": "Rutgers E-Scooter / Bike",
                    "type": "Bike / E-Scooter",
                    "estimated_minutes": 11,
                    "rush_hour_minutes": 12,
                    "badge": "Active Commute",
                    "description": "Direct bike ride up George Street into College Ave."
                },
                {
                    "name": "Knight Mover / Escort",
                    "type": "Campus Shuttle",
                    "estimated_minutes": 15,
                    "rush_hour_minutes": 18,
                    "badge": "On-Demand",
                    "description": "Rutgers on-demand student transit."
                },
                {
                    "name": "Walking Path via George Street",
                    "type": "Walking Path",
                    "estimated_minutes": 22,
                    "walk_miles": 1.1,
                    "rush_hour_minutes": 22,
                    "badge": "Pedestrian",
                    "description": "Direct pedestrian walk up George Street into College Ave."
                },
                {
                    "name": "Weekend 2 (Full Reverse Loop)",
                    "type": "Alternative Loop",
                    "estimated_minutes": 30,
                    "rush_hour_minutes": 36,
                    "badge": "Full Loop",
                    "description": "Loops Livingston and Busch before arriving at College Ave."
                }
            ]
        else:
            routes = [
                {
                    "name": "Route F (Express via Route 18)",
                    "type": "Direct Bus",
                    "estimated_minutes": 10,
                    "rush_hour_minutes": 18,
                    "badge": "Fastest Direct",
                    "description": "Express bus connecting Cook/Douglass back to College Ave."
                },
                {
                    "name": "Rutgers E-Scooter / Bike",
                    "type": "Bike / E-Scooter",
                    "estimated_minutes": 11,
                    "rush_hour_minutes": 12,
                    "badge": "Active Commute",
                    "description": "Bike ride along George Street."
                },
                {
                    "name": "Route EE (Local via George St)",
                    "type": "Direct Bus",
                    "estimated_minutes": 15,
                    "rush_hour_minutes": 22,
                    "badge": "Alternative Direct",
                    "description": "Local bus servicing downtown New Brunswick and College Ave."
                },
                {
                    "name": "Walking Path via George Street",
                    "type": "Walking Path",
                    "estimated_minutes": 22,
                    "walk_miles": 1.1,
                    "rush_hour_minutes": 22,
                    "badge": "Pedestrian",
                    "description": "Direct sidewalk route to College Ave."
                }
            ]

    elif key == ("Busch", "Cook/Douglass"):
        if is_weekend:
            routes = [
                {
                    "name": "Weekend 1 (via Livingston)",
                    "type": "Alternative Loop",
                    "estimated_minutes": 22,
                    "rush_hour_minutes": 28,
                    "badge": "Fastest Loop",
                    "description": "Hop on Weekend 1 from Busch; stops at Livingston then arrives directly at Cook/Douglass."
                },
                {
                    "name": "Weekend 2 (via College Ave)",
                    "type": "Alternative Loop",
                    "estimated_minutes": 24,
                    "rush_hour_minutes": 30,
                    "badge": "Alternative Loop",
                    "description": "Board Weekend 2 from Busch; stops at College Ave then proceeds directly into Cook/Douglass."
                },
                {
                    "name": "Knight Mover / Shuttle",
                    "type": "Campus Shuttle",
                    "estimated_minutes": 20,
                    "rush_hour_minutes": 25,
                    "badge": "On-Demand",
                    "description": "On-demand student transit between Busch and Cook/Douglass."
                },
                {
                    "name": "Rutgers E-Scooter / Bike",
                    "type": "Bike / E-Scooter",
                    "estimated_minutes": 25,
                    "rush_hour_minutes": 26,
                    "badge": "Active Commute",
                    "description": "Bike route via Landing Lane Bridge and George Street corridor."
                }
            ]
        else:
            routes = [
                {
                    "name": "Route REXB (Direct Express)",
                    "type": "Direct Bus",
                    "estimated_minutes": 15,
                    "rush_hour_minutes": 26,
                    "badge": "Fastest Direct",
                    "description": "Direct express bus connecting Busch (Hill Center / Science Buildings) directly to Cook/Douglass."
                },
                {
                    "name": "Knight Mover / Shuttle",
                    "type": "Campus Shuttle",
                    "estimated_minutes": 20,
                    "rush_hour_minutes": 25,
                    "badge": "On-Demand",
                    "description": "On-demand campus escort shuttle service."
                },
                {
                    "name": "Rutgers E-Scooter / Bike",
                    "type": "Bike / E-Scooter",
                    "estimated_minutes": 25,
                    "rush_hour_minutes": 26,
                    "badge": "Active Commute",
                    "description": "Bike path via Landing Lane and George Street."
                },
                {
                    "name": "Transfer via College Ave (Route A + Route F)",
                    "type": "Transfer Route",
                    "estimated_minutes": 26,
                    "rush_hour_minutes": 34,
                    "badge": "Transfer Connection",
                    "description": "If REXB is delayed: take Route A to Scott Hall / The Yard, transfer to Route F to Cook."
                }
            ]

    elif key == ("Cook/Douglass", "Busch"):
        if is_weekend:
            routes = [
                {
                    "name": "Weekend 2 (via Livingston)",
                    "type": "Alternative Loop",
                    "estimated_minutes": 22,
                    "rush_hour_minutes": 28,
                    "badge": "Fastest Loop",
                    "description": "Take Weekend 2 from Cook/Douglass; reaches Livingston then immediately heads to Busch."
                },
                {
                    "name": "Weekend 1 (via College Ave)",
                    "type": "Alternative Loop",
                    "estimated_minutes": 24,
                    "rush_hour_minutes": 30,
                    "badge": "Alternative Loop",
                    "description": "Take Weekend 1 from Cook/Douglass; heads to College Ave then directly into Busch."
                },
                {
                    "name": "Knight Mover / Shuttle",
                    "type": "Campus Shuttle",
                    "estimated_minutes": 20,
                    "rush_hour_minutes": 25,
                    "badge": "On-Demand",
                    "description": "On-demand campus escort shuttle service."
                },
                {
                    "name": "Rutgers E-Scooter / Bike",
                    "type": "Bike / E-Scooter",
                    "estimated_minutes": 25,
                    "rush_hour_minutes": 26,
                    "badge": "Active Commute",
                    "description": "Bike route via George Street and Landing Lane Bridge."
                }
            ]
        else:
            routes = [
                {
                    "name": "Route REXB (Direct Express)",
                    "type": "Direct Bus",
                    "estimated_minutes": 15,
                    "rush_hour_minutes": 26,
                    "badge": "Fastest Direct",
                    "description": "Direct express bus connecting Cook/Douglass directly back to Busch Campus."
                },
                {
                    "name": "Knight Mover / Shuttle",
                    "type": "Campus Shuttle",
                    "estimated_minutes": 20,
                    "rush_hour_minutes": 25,
                    "badge": "On-Demand",
                    "description": "On-demand campus escort shuttle service."
                },
                {
                    "name": "Rutgers E-Scooter / Bike",
                    "type": "Bike / E-Scooter",
                    "estimated_minutes": 25,
                    "rush_hour_minutes": 26,
                    "badge": "Active Commute",
                    "description": "Bike path via George Street and Landing Lane Bridge."
                },
                {
                    "name": "Transfer via College Ave (Route F + Route A)",
                    "type": "Transfer Route",
                    "estimated_minutes": 26,
                    "rush_hour_minutes": 34,
                    "badge": "Transfer Connection",
                    "description": "Transfer option: Route F to College Ave, then Route A/H to Busch."
                }
            ]

    elif key == ("Livingston", "Cook/Douglass"):
        if is_weekend:
            routes = [
                {
                    "name": "Weekend 1 (Direct Hop)",
                    "type": "Direct Bus",
                    "estimated_minutes": 12,
                    "rush_hour_minutes": 16,
                    "badge": "Fastest Direct",
                    "description": "Weekend 1 runs straight from Livingston Student Center into Cook/Douglass."
                },
                {
                    "name": "Knight Mover / Shuttle",
                    "type": "Campus Shuttle",
                    "estimated_minutes": 18,
                    "rush_hour_minutes": 22,
                    "badge": "On-Demand",
                    "description": "On-demand student escort shuttle between campus student centers."
                },
                {
                    "name": "Rutgers E-Scooter / Bike",
                    "type": "Bike / E-Scooter",
                    "estimated_minutes": 26,
                    "rush_hour_minutes": 28,
                    "badge": "Active Commute",
                    "description": "Bike path via Route 18 corridor and Commercial Ave into Cook/Douglass."
                },
                {
                    "name": "Weekend 2 (Full Loop via Busch)",
                    "type": "Alternative Loop",
                    "estimated_minutes": 34,
                    "rush_hour_minutes": 40,
                    "badge": "Full Loop",
                    "description": "Loops Busch and College Ave before arriving at Cook/Douglass."
                }
            ]
        else:
            routes = [
                {
                    "name": "Route REXL (Direct Express)",
                    "type": "Direct Bus",
                    "estimated_minutes": 15,
                    "rush_hour_minutes": 26,
                    "badge": "Fastest Direct",
                    "description": "Express bus connecting Livingston Plaza/Student Center directly to Cook/Douglass."
                },
                {
                    "name": "Transfer via College Ave (Route LX + Route F)",
                    "type": "Transfer Route",
                    "estimated_minutes": 24,
                    "rush_hour_minutes": 32,
                    "badge": "Transfer Connection",
                    "description": "If REXL has long headways: take Route LX to Scott Hall, transfer to Route F to Cook."
                },
                {
                    "name": "Knight Mover / Shuttle",
                    "type": "Campus Shuttle",
                    "estimated_minutes": 18,
                    "rush_hour_minutes": 22,
                    "badge": "On-Demand",
                    "description": "On-demand student transit between campus student centers."
                },
                {
                    "name": "Rutgers E-Scooter / Bike",
                    "type": "Bike / E-Scooter",
                    "estimated_minutes": 26,
                    "rush_hour_minutes": 28,
                    "badge": "Active Commute",
                    "description": "Bike route via Avenue E and Route 18 trail into Cook."
                }
            ]

    elif key == ("Cook/Douglass", "Livingston"):
        if is_weekend:
            routes = [
                {
                    "name": "Weekend 2 (Direct Hop)",
                    "type": "Direct Bus",
                    "estimated_minutes": 12,
                    "rush_hour_minutes": 16,
                    "badge": "Fastest Direct",
                    "description": "Weekend 2 runs straight from Cook/Douglass into Livingston Plaza & Student Center."
                },
                {
                    "name": "Knight Mover / Shuttle",
                    "type": "Campus Shuttle",
                    "estimated_minutes": 18,
                    "rush_hour_minutes": 22,
                    "badge": "On-Demand",
                    "description": "On-demand student escort shuttle between campus student centers."
                },
                {
                    "name": "Rutgers E-Scooter / Bike",
                    "type": "Bike / E-Scooter",
                    "estimated_minutes": 26,
                    "rush_hour_minutes": 28,
                    "badge": "Active Commute",
                    "description": "Bike path via Commercial Ave and Avenue E into Livingston."
                },
                {
                    "name": "Weekend 1 (Full Loop via College Ave)",
                    "type": "Alternative Loop",
                    "estimated_minutes": 34,
                    "rush_hour_minutes": 40,
                    "badge": "Full Loop",
                    "description": "Loops College Ave and Busch before arriving at Livingston."
                }
            ]
        else:
            routes = [
                {
                    "name": "Route REXL (Direct Express)",
                    "type": "Direct Bus",
                    "estimated_minutes": 15,
                    "rush_hour_minutes": 26,
                    "badge": "Fastest Direct",
                    "description": "Express bus connecting Cook/Douglass directly back to Livingston Campus."
                },
                {
                    "name": "Transfer via College Ave (Route F + Route LX)",
                    "type": "Transfer Route",
                    "estimated_minutes": 24,
                    "rush_hour_minutes": 32,
                    "badge": "Transfer Connection",
                    "description": "Transfer option: Route F to College Ave, transfer to Route LX to Livingston."
                },
                {
                    "name": "Knight Mover / Shuttle",
                    "type": "Campus Shuttle",
                    "estimated_minutes": 18,
                    "rush_hour_minutes": 22,
                    "badge": "On-Demand",
                    "description": "On-demand student transit between campus student centers."
                },
                {
                    "name": "Rutgers E-Scooter / Bike",
                    "type": "Bike / E-Scooter",
                    "estimated_minutes": 26,
                    "rush_hour_minutes": 28,
                    "badge": "Active Commute",
                    "description": "Bike route via Commercial Ave and Avenue E."
                }
            ]

    else:
        # Fallback for any unexpected campus pair: provide general sorted transit options
        routes = [
            {
                "name": "Transfer via College Ave (Scott Hall)",
                "type": "Transfer Route",
                "estimated_minutes": 24,
                "rush_hour_minutes": 32,
                "badge": "Transfer Connection",
                "description": f"Take the first departing bus to College Ave (Scott Hall/The Yard) and transfer to {dest}."
            },
            {
                "name": "Rutgers E-Scooter / Bike",
                "type": "Bike / E-Scooter",
                "estimated_minutes": 25,
                "rush_hour_minutes": 28,
                "badge": "Active Commute",
                "description": f"Ride bike/scooter across campus trails towards {dest}."
            },
            {
                "name": "Knight Mover / Student Escort",
                "type": "Campus Shuttle",
                "estimated_minutes": 28,
                "rush_hour_minutes": 35,
                "badge": "On-Demand",
                "description": "Request Rutgers Knight Mover on-demand curb-to-curb service."
            }
        ]

    # Always sort all suggested routes by estimated travel time to destination
    routes.sort(key=lambda r: r["estimated_minutes"])
    return routes
