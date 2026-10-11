import math
from datetime import datetime
from typing import List, Dict, Any, Optional

def haversine_distance_miles(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 3958.8
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat/2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2) ** 2)
    a = max(0.0, min(1.0, a))   # clamp to [0,1] – guards against floating-point rounding errors
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 2)

def walk_time_minutes(distance_miles: float, speed_mph: float = 3.0) -> int:
    """Calculates walk duration in minutes using user's specific walking speed."""
    if speed_mph <= 0:
        speed_mph = 3.0
    return max(1, round((distance_miles / speed_mph) * 60))

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
        walk_mins = max(2, walk_time_minutes(0.25, walking_speed_mph))
        routes = [
            {
                "name": "Campus Pedestrian Walk",
                "type": "Walking Path",
                "estimated_minutes": walk_mins,
                "walk_miles": 0.25,
                "rush_hour_minutes": walk_mins,
                "badge": "Recommended Walk",
                "description": f"Direct pedestrian path between buildings on {origin}. Fastest on-campus route with zero bus wait."
            },
            {
                "name": primary_bus,
                "type": "Campus Bus",
                "estimated_minutes": 8,
                "rush_hour_minutes": 10,
                "badge": "Campus Bus",
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
                "name": alt_bus,
                "type": "Campus Bus",
                "estimated_minutes": 10,
                "rush_hour_minutes": 12,
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
            # ── Farther-stop trade-off: Jersey Mike's (Livingston) → Busch Student Center ──
            # Origin: Jersey Mike's parking lot on Livingston
            jersey_mikes_coords = (40.5280, -74.4390)
            livi_plaza_coords        = (40.52511, -74.43858)   # Closest stop
            livi_student_center_coords = (40.524, -74.43663)   # Farther stop

            # Option A: Closest stop — Livingston Plaza
            dist_plaza      = haversine_distance_miles(jersey_mikes_coords[0], jersey_mikes_coords[1],
                                                       livi_plaza_coords[0], livi_plaza_coords[1])
            walk_plaza_mins = walk_time_minutes(dist_plaza, walking_speed_mph)
            wait_plaza_mins = 12   # Next Route B arriving at Plaza in ~12 mins
            ride_plaza_mins = 7
            total_plaza_mins = walk_plaza_mins + wait_plaza_mins + ride_plaza_mins

            # Option B: Farther stop — Livingston Student Center
            dist_lsc        = haversine_distance_miles(jersey_mikes_coords[0], jersey_mikes_coords[1],
                                                       livi_student_center_coords[0], livi_student_center_coords[1])
            walk_lsc_mins   = walk_time_minutes(dist_lsc, walking_speed_mph)
            wait_lsc_mins   = 0    # Bus pulls up at LSC right as you finish walking
            ride_lsc_mins   = 6
            total_lsc_mins  = walk_lsc_mins + wait_lsc_mins + ride_lsc_mins

            time_saved = total_plaza_mins - total_lsc_mins

            routes = [
                # Farther stop — arrives faster when time_saved > 0
                {
                    "name": "Route B via Livingston Student Center (Farther Stop)",
                    "type": "Direct Bus",
                    "estimated_minutes": total_lsc_mins,
                    "walk_miles": dist_lsc,
                    "walk_minutes": walk_lsc_mins,
                    "rush_hour_minutes": total_lsc_mins + 4,
                    "badge": f"Walk Farther & Save {time_saved} Mins",
                    "description": (
                        f"Walk {walk_lsc_mins} mins ({dist_lsc} mi) to Livingston Student Center. "
                        f"Route B arrives right as you get there! "
                        f"Arrives {time_saved} minutes earlier than waiting at Livingston Plaza."
                    )
                },
                # Closest stop — less walking, more waiting
                {
                    "name": "Route B via Livingston Plaza (Closest Stop)",
                    "type": "Direct Bus",
                    "estimated_minutes": total_plaza_mins,
                    "walk_miles": dist_plaza,
                    "walk_minutes": walk_plaza_mins,
                    "rush_hour_minutes": total_plaza_mins + 5,
                    "badge": "Closest Stop",
                    "description": (
                        f"Walk {walk_plaza_mins} mins to Livingston Plaza, "
                        f"wait {wait_plaza_mins} mins for Route B, "
                        f"then take a {ride_plaza_mins} min bus ride to Busch Student Center."
                    )
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


# ---------------------------------------------------------------------------
# Multi-Modal Planner  (Walk-to-Stop + Live Bus + Farther-Stop Trade-off)
# ---------------------------------------------------------------------------

def plan_multimodal_route(
    origin_coords: List[float],          # [lat, lon] of user's exact location
    dest_coords: List[float],            # [lat, lon] of destination building
    origin_name: str,                    # human-readable origin (e.g. "Jersey Mike's")
    dest_name: str,                      # human-readable destination (e.g. "Busch Student Center")
    live_buses: List[Dict[str, Any]],    # from GET /api/telemetry – list of active bus dicts
    walking_speed_mph: float = 3.0,      # from user profile
    max_walk_miles: float = 0.5,         # from user profile (max_walking_distance in miles)
    prefer_walking: bool = True,         # from user profile
    candidate_stops: Optional[Dict[str, Any]] = None,  # CAMPUS_STOPS dict
) -> Dict[str, Any]:
    """
    Executes the full walk-to-stop + live bus + farther-stop trade-off evaluation:

    1. Find all candidate stops within a generous search radius (1.5× max_walk_miles).
    2. For each candidate stop:
       a. Compute walking distance & walk time (using user's walking_speed_mph).
       b. Find the earliest live bus ETA at that stop.
       c. Compute: total_time = walk_time + max(0, bus_eta - walk_time) + bus_ride_time.
    3. Rank all options by total_time.
    4. If a farther stop beats the closest stop, flag it as "Walk Farther & Save Time".
    5. Respect user preferences: if user can't walk that far or prefers not to walk,
       only suggest farther stops that save ≥ 4 minutes.
    6. Always include the closest stop as a baseline option.

    Returns a dict with:
      - "options"     : ranked list of multimodal route options
      - "recommended" : the single best option dict
      - "summary"     : human-readable recommendation string
    """
    from app.rutgers_data import CAMPUS_STOPS

    stops_dict = candidate_stops or CAMPUS_STOPS

    olat, olon = origin_coords[0], origin_coords[1]
    dlat, dlon = dest_coords[0], dest_coords[1]

    # ── 1. Score every known stop ────────────────────────────────────────────
    SEARCH_RADIUS_MILES = max(1.5 * max_walk_miles, 0.6)   # always look at least 0.6 mi

    # Pre-compute the bus ride time from each stop to destination using haversine
    # (approximation: Rutgers buses average ~12 mph effective on-campus speed)
    BUS_EFFECTIVE_MPH = 12.0

    stop_candidates: List[Dict[str, Any]] = []

    for stop_name, stop_meta in stops_dict.items():
        stop_coords = stop_meta.get("coords")
        if not stop_coords or len(stop_coords) < 2:
            continue

        slat, slon = stop_coords[0], stop_coords[1]

        # Distance from user's origin to this stop
        dist_to_stop_miles = haversine_distance_miles(olat, olon, slat, slon)
        if dist_to_stop_miles > SEARCH_RADIUS_MILES:
            continue

        # Distance from stop to destination (proxy for bus ride length)
        dist_stop_to_dest_miles = haversine_distance_miles(slat, slon, dlat, dlon)

        # Walk time from origin → stop
        walk_mins = walk_time_minutes(dist_to_stop_miles, walking_speed_mph)

        # Bus ride time from stop → destination (haversine / bus speed)
        bus_ride_mins = max(2, round((dist_stop_to_dest_miles / BUS_EFFECTIVE_MPH) * 60))

        # ── 2. Find earliest live bus ETA at this stop ───────────────────────
        stop_routes = set(stop_meta.get("routes", []))
        best_bus_eta: Optional[int] = None
        best_bus_route: Optional[str] = None

        for bus in live_buses:
            bus_route = bus.get("route", "")
            # Match: bus route overlaps with stop's served routes
            route_match = any(
                sr.upper() in bus_route.upper() or bus_route.upper() in sr.upper()
                for sr in stop_routes
            )
            if not route_match:
                continue

            # Use upcoming_stops ETA if the bus will actually pass through this stop
            upcoming = bus.get("upcoming_stops", [])
            for upcoming_stop in upcoming:
                us_name = (upcoming_stop.get("station") or "").lower()
                if stop_name.lower() in us_name or us_name in stop_name.lower():
                    eta_at_stop = upcoming_stop.get("eta_mins", bus.get("eta_mins", 5))
                    if best_bus_eta is None or eta_at_stop < best_bus_eta:
                        best_bus_eta = eta_at_stop
                        best_bus_route = bus_route
                    break
            else:
                # No upcoming_stops match → use the bus's own eta_mins as fallback
                bus_eta = bus.get("eta_mins", 5)
                if best_bus_eta is None or bus_eta < best_bus_eta:
                    best_bus_eta = bus_eta
                    best_bus_route = bus_route

        if best_bus_eta is None:
            # No live bus found for this stop → skip it (don't recommend ghost stops)
            continue

        # ── 3. Total journey time ────────────────────────────────────────────
        # If you walk fast enough to arrive BEFORE the bus, wait = 0
        wait_mins = max(0, best_bus_eta - walk_mins)
        total_mins = walk_mins + wait_mins + bus_ride_mins

        stop_candidates.append({
            "stop_name": stop_name,
            "stop_coords": stop_coords,
            "stop_campus": stop_meta.get("campus", ""),
            "dist_to_stop_miles": dist_to_stop_miles,
            "walk_mins": walk_mins,
            "bus_route": best_bus_route,
            "bus_eta_mins": best_bus_eta,
            "wait_mins": wait_mins,
            "bus_ride_mins": bus_ride_mins,
            "total_mins": total_mins,
            "within_user_max_walk": dist_to_stop_miles <= max_walk_miles,
        })

    # ── 4. Rank by total travel time ─────────────────────────────────────────
    stop_candidates.sort(key=lambda x: (x["total_mins"], x["dist_to_stop_miles"]))

    if not stop_candidates:
        # No live bus coverage – fall back to walking estimate
        walk_total_miles = haversine_distance_miles(olat, olon, dlat, dlon)
        walk_total_mins = walk_time_minutes(walk_total_miles, walking_speed_mph)
        return {
            "options": [],
            "recommended": None,
            "summary": (
                f"No live buses found near {origin_name}. "
                f"Walking to {dest_name} would take ~{walk_total_mins} min ({walk_total_miles} mi)."
            )
        }

    # ── 5. Build ranked option list ───────────────────────────────────────────
    closest_stop = min(stop_candidates, key=lambda x: x["dist_to_stop_miles"])
    best_option  = stop_candidates[0]   # already sorted by total_mins

    options: List[Dict[str, Any]] = []
    for i, c in enumerate(stop_candidates[:5]):   # top-5 options
        is_farther = c["stop_name"] != closest_stop["stop_name"]
        time_saved = closest_stop["total_mins"] - c["total_mins"]

        # Preference guard: if user can't walk that far or prefers not to walk,
        # only suggest farther stops if they save ≥ 4 minutes
        if is_farther:
            user_can_walk = c["within_user_max_walk"]
            if not user_can_walk or (not prefer_walking and time_saved < 4):
                continue   # skip this option for this user

        badge = "🏆 Fastest Route" if i == 0 else (
            "🚶 Walk Farther & Save Time" if (is_farther and time_saved >= 1) else
            "🚌 Closest Stop"
        )

        if c["wait_mins"] == 0:
            timing_note = f"walk {c['walk_mins']} min → board immediately (bus arrives same time)"
        else:
            timing_note = f"walk {c['walk_mins']} min → wait {c['wait_mins']} min → ride {c['bus_ride_mins']} min"

        desc = (
            f"Walk {c['dist_to_stop_miles']} mi to **{c['stop_name']}** "
            f"({c['walk_mins']} min at your speed). "
            f"Catch **Route {c['bus_route']}** arriving in {c['bus_eta_mins']} min. "
            f"Bus ride ~{c['bus_ride_mins']} min to {dest_name}. "
            f"Total: **{c['total_mins']} min** ({timing_note})."
        )

        if is_farther and time_saved >= 1:
            desc += (
                f" ⚡ Saves **{time_saved} min** vs waiting at "
                f"{closest_stop['stop_name']}!"
            )

        options.append({
            "rank": i + 1,
            "badge": badge,
            "stop_name": c["stop_name"],
            "stop_campus": c["stop_campus"],
            "bus_route": c["bus_route"],
            "dist_to_stop_miles": c["dist_to_stop_miles"],
            "walk_mins": c["walk_mins"],
            "wait_mins": c["wait_mins"],
            "bus_ride_mins": c["bus_ride_mins"],
            "bus_eta_mins": c["bus_eta_mins"],
            "total_mins": c["total_mins"],
            "time_saved_vs_closest": max(0, time_saved),
            "within_user_max_walk": c["within_user_max_walk"],
            "description": desc,
            "type": "Multimodal (Walk + Bus)",
        })

    # ── 5b. Evaluate direct pedestrian walk between buildings ─────────────────
    direct_walk_miles = haversine_distance_miles(olat, olon, dlat, dlon)
    direct_walk_mins = max(1, walk_time_minutes(direct_walk_miles, walking_speed_mph))

    if direct_walk_miles <= max(0.85, max_walk_miles):
        fastest_bus_mins = options[0]["total_mins"] if options else 99
        is_walk_faster = direct_walk_mins <= fastest_bus_mins
        time_saved = max(0, fastest_bus_mins - direct_walk_mins)
        badge = "🏆 Fastest Walk" if is_walk_faster else "🚶 Direct Campus Walk"

        walk_desc = (
            f"Walk directly from {origin_name} to {dest_name} along campus pedestrian paths "
            f"({direct_walk_miles} mi, ~{direct_walk_mins} min at {walking_speed_mph} mph). "
            f"Direct cross-building route with zero bus wait."
        )
        if time_saved >= 1:
            walk_desc += f" ⚡ Arrives {time_saved} min faster than taking the bus!"

        direct_walk_opt = {
            "badge": badge,
            "stop_name": dest_name,
            "stop_campus": "",
            "bus_route": "Campus Walk",
            "dist_to_stop_miles": direct_walk_miles,
            "walk_mins": direct_walk_mins,
            "wait_mins": 0,
            "bus_ride_mins": 0,
            "bus_eta_mins": 0,
            "total_mins": direct_walk_mins,
            "time_saved_vs_closest": time_saved,
            "within_user_max_walk": direct_walk_miles <= max_walk_miles,
            "description": walk_desc,
            "type": "Walking Path",
        }

        if is_walk_faster or (prefer_walking and direct_walk_miles <= 0.65):
            options.insert(0, direct_walk_opt)
        else:
            options.append(direct_walk_opt)

        for idx, opt in enumerate(options):
            opt["rank"] = idx + 1

    # ── 6. Build summary string ───────────────────────────────────────────────
    if not options:
        # All feasible options were filtered out by user prefs — use closest stop regardless
        c = closest_stop
        options = [{
            "rank": 1,
            "badge": "🚌 Closest Stop",
            "stop_name": c["stop_name"],
            "stop_campus": c["stop_campus"],
            "bus_route": c["bus_route"],
            "dist_to_stop_miles": c["dist_to_stop_miles"],
            "walk_mins": c["walk_mins"],
            "wait_mins": c["wait_mins"],
            "bus_ride_mins": c["bus_ride_mins"],
            "bus_eta_mins": c["bus_eta_mins"],
            "total_mins": c["total_mins"],
            "time_saved_vs_closest": 0,
            "within_user_max_walk": c["within_user_max_walk"],
            "description": (
                f"Walk {c['dist_to_stop_miles']} mi to **{c['stop_name']}** "
                f"({c['walk_mins']} min). Catch **Route {c['bus_route']}** in "
                f"{c['bus_eta_mins']} min. Total: **{c['total_mins']} min**."
            ),
            "type": "Multimodal (Walk + Bus)",
        }]

    top = options[0]

    # Check if farther-stop option is recommended
    if (len(options) > 1 and
            options[0]["stop_name"] != closest_stop["stop_name"] and
            options[0]["time_saved_vs_closest"] >= 1):
        summary = (
            f"Walk {top['walk_mins']} min to {top['stop_name']} "
            f"to catch Route {top['bus_route']} and arrive at {dest_name} "
            f"{top['time_saved_vs_closest']} min earlier than waiting at "
            f"{closest_stop['stop_name']}! Total: {top['total_mins']} min."
        )
    else:
        summary = (
            f"Head to {top['stop_name']} ({top['walk_mins']} min walk). "
            f"Route {top['bus_route']} arrives in {top['bus_eta_mins']} min. "
            f"Total journey to {dest_name}: ~{top['total_mins']} min."
        )

    return {
        "origin": origin_name,
        "destination": dest_name,
        "origin_coords": origin_coords,
        "dest_coords": dest_coords,
        "walking_speed_mph": walking_speed_mph,
        "max_walk_miles": max_walk_miles,
        "prefer_walking": prefer_walking,
        "options": options,
        "recommended": top,
        "summary": summary,
    }
