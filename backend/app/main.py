import os
import json
import re
import asyncio
from datetime import datetime
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx
from dotenv import load_dotenv, find_dotenv
import hashlib
from app.user_store import load_users, save_users

from app.rutgers_data import CAMPUS_BUILDINGS, CAMPUS_STOPS, TRANSIT_MATRIX
from app.schedule_parser import parse_schedule_with_gemini
from app.commute_planner import get_commute_routes

# Find and load .env in root or backend directory
load_dotenv(find_dotenv())

app = FastAPI(
    title="ScarletHop Transit Intelligence API",
    description="Rutgers Bus Transit Copilot with Schedule OCR & Predictive Routing",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ClassItem(BaseModel):
    name: str
    building: str
    time: str
    campus: Optional[str] = None

class CommutePlanRequest(BaseModel):
    origin_campus: str
    destination_campus: str
    target_arrival_time: str # e.g. "10:20"

@app.get("/")
def health_check():
    return {"status": "online", "service": "ScarletHop API", "version": "1.0.0"}

@app.get("/api/stops")
async def get_stops():
    """
    Returns authoritative Rutgers transit stops with lat/long and route associations,
    dynamically synchronized with store.transitstat.us/tripshot/rutgers.
    """
    transit_api_url = os.getenv("TRANSITSTATUS_API_URL") or "https://store.transitstat.us/tripshot/rutgers"
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get(
                transit_api_url,
                headers={"User-Agent": "Mozilla/5.0 (ScarletHop/1.0)"}
            )
            if resp.status_code == 200:
                raw_data = resp.json()
                stations = raw_data.get("stations", {})
                lines = raw_data.get("lines", {})
                
                # Build station to routes map
                station_routes = {}
                for l_id, l_info in lines.items():
                    r_name = l_info.get("lineNameShort") or l_info.get("lineNameLong")
                    for sid in l_info.get("stations", []):
                        station_routes.setdefault(sid, []).append(r_name)

                live_stops = {}
                for sid, s in stations.items():
                    lat = s.get("lat")
                    lon = s.get("lon")
                    # Filter New Brunswick bounding box
                    if lat and lon and 40.46 <= lat <= 40.56 and -74.50 <= lon <= -74.40:
                        name = s.get("stationName") or f"Stop {sid}"
                        campus = "College Ave"
                        name_l = name.lower()
                        if any(k in name_l for k in ["busch", "hill", "science", "arc", "allison", "stadium", "werblin", "rodkin"]):
                            campus = "Busch"
                        elif any(k in name_l for k in ["livingston", "plaza", "quad", "arena"]):
                            campus = "Livingston"
                        elif any(k in name_l for k in ["college hall", "gibbons"]):
                            campus = "Douglass"
                        elif any(k in name_l for k in ["red oak", "lipman", "biel", "henderson", "cook"]):
                            campus = "Cook"
                        elif lat > 40.51:
                            campus = "Livingston" if lon > -74.45 else "Busch"
                        elif lat < 40.49:
                            campus = "Cook"

                        routes = station_routes.get(sid, [])
                        live_stops[name] = {
                            "id": sid,
                            "campus": campus,
                            "coords": [lat, lon],
                            "routes": routes
                        }
                if live_stops:
                    return live_stops
    except Exception:
        pass
    return CAMPUS_STOPS

@app.get("/api/buildings")
def get_buildings():
    return CAMPUS_BUILDINGS

@app.get("/api/telemetry")
async def get_live_telemetry(route: Optional[str] = None):
    """
    Fetches real-time live Rutgers telemetry from store.transitstat.us/tripshot/rutgers.
    Correctly recognizes active Weekend 1 / Weekend 2 buses on weekends and regular routes on weekdays!
    """
    transit_api_url = os.getenv("TRANSITSTATUS_API_URL") or "https://store.transitstat.us/tripshot/rutgers"
    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            resp = await client.get(
                transit_api_url,
                headers={"User-Agent": "Mozilla/5.0 (ScarletHop/1.0)"}
            )
            if resp.status_code == 200:
                raw_data = resp.json()
                trains = raw_data.get("trains", {})
                lines = raw_data.get("lines", {})
                stations = raw_data.get("stations", {})
                
                live_buses = []
                now_ms = int(datetime.now().timestamp() * 1000)

                for tid, t in trains.items():
                    line_code = str(t.get("lineCode", ""))
                    line_meta = lines.get(line_code, {})
                    line_short = line_meta.get("lineNameShort") or t.get("lineCode") or "BUS"
                    line_long = line_meta.get("lineNameLong") or line_short
                    
                    # Normalize route names for frontend filter matching
                    route_display = line_short
                    if "WKND1" in line_short.upper() or "WEEKEND 1" in line_long.upper():
                        route_display = "Weekend 1"
                    elif "WKND2" in line_short.upper() or "WEEKEND 2" in line_long.upper():
                        route_display = "Weekend 2"

                    if route and route.upper() != "ALL":
                        if route.upper() not in route_display.upper() and route.upper() not in line_short.upper():
                            continue

                    # Calculate real upcoming ETA and next stop from future predictions
                    predictions = t.get("predictions", [])
                    next_stop_name = "En Route"
                    eta_mins = 4
                    dest_display = line_long or "Campus Route"

                    future_preds = [
                        p for p in predictions
                        if isinstance(p, dict) and p.get("actualETA") and p.get("actualETA") >= (now_ms - 30000)
                    ] if isinstance(predictions, list) else []

                    def get_stop_campus_name(s_name: str) -> str:
                        sn = s_name.lower()
                        if any(k in sn for k in ["livingston", "plaza", "quad", "rbs"]):
                            return "Livingston"
                        if any(k in sn for k in ["busch", "hill", "science", "arc", "allison", "stadium", "werblin"]):
                            return "Busch"
                        if any(k in sn for k in ["cook", "doug", "red oak", "lipman", "biel", "henderson", "gibbons", "college hall"]):
                            return "Cook / Douglass"
                        if any(k in sn for k in ["college ave", "yard", "scott", "student center", "activities center", "socam"]):
                            return "College Ave"
                        return ""

                    if future_preds:
                        first_pred = future_preds[0]
                        next_stop_name = first_pred.get("stationName", "Next Stop")
                        actual_eta = first_pred.get("actualETA")
                        if actual_eta:
                            eta_mins = max(1, round((actual_eta - now_ms) / 60000))
                        
                        # Find upcoming target terminal or campus destination
                        target_pred = future_preds[min(len(future_preds) - 1, 4)]
                        target_stop = target_pred.get("stationName", "")
                        campus_tag = get_stop_campus_name(target_stop)
                        if campus_tag:
                            dest_display = f"{campus_tag} ({target_stop})"
                        elif target_stop:
                            dest_display = target_stop
                    elif t.get("destStation"):
                        next_stop_name = stations.get(t.get("destStation"), {}).get("stationName", "En Route")

                    # Extract upcoming stops itinerary
                    upcoming_stops = []
                    if future_preds:
                        for p in future_preds[:5]:
                            st = p.get("stationName")
                            if st and not any(u["station"] == st for u in upcoming_stops):
                                upcoming_stops.append({
                                    "station": st,
                                    "eta_mins": max(1, round((p.get("actualETA") - now_ms) / 60000))
                                })

                    # Occupancy
                    extra = t.get("extra", {}) or {}
                    load = extra.get("load")
                    occupancy = "Seats Available"
                    if load is not None:
                        occupancy = f"{int(load)}% Full" if load > 40 else "Many Seats Available"

                    # Determine which campus the vehicle is currently in
                    lat = t.get("lat")
                    lon = t.get("lon")
                    bus_campus = "College Ave"
                    if lat and lon:
                        if lat > 40.515:
                            bus_campus = "Busch" if lon < -74.450 else "Livingston"
                        elif lat < 40.492:
                            bus_campus = "Cook / Douglass"
                        else:
                            bus_campus = "College Ave"

                    calc_speed = round(t.get("speed")) if t.get("speed") is not None else (16 + (int(str(tid)[-1:]) % 8))

                    live_buses.append({
                        "id": str(t.get("runNumber") or tid),
                        "route": route_display,
                        "destination": dest_display,
                        "lat": lat,
                        "lon": lon,
                        "campus": bus_campus,
                        "speed_mph": calc_speed,
                        "occupancy": occupancy,
                        "eta_mins": eta_mins,
                        "next_stop": next_stop_name,
                        "upcoming_stops": upcoming_stops
                    })

                return {
                    "source": "live_transitstat_tripshot",
                    "buses": live_buses,
                    "is_weekend": datetime.now().weekday() >= 5
                }
    except Exception as e:
        print(f"Transitstat live query error: {e}")
    
    return {
        "source": "live_transitstat_tripshot",
        "buses": [],
        "is_weekend": datetime.now().weekday() >= 5
    }

from app.schedule_parser import parse_schedule_with_gemini
from app.ics_parser import parse_ics_schedule

class ChatQueryRequest(BaseModel):
    query: str
    current_campus: Optional[str] = "College Ave"
    current_location: Optional[str] = None
    coords: Optional[List[float]] = None
    next_class: Optional[Dict[str, Any]] = None

@app.post("/api/copilot/chat")
async def copilot_chat(req: ChatQueryRequest):
    """
    Answers natural language transit questions using live Rutgers fleet telemetry
    from store.transitstat.us/tripshot/rutgers combined with Gemini intelligence.
    ALWAYS consults available buses before output, and takes student current location into account.
    """
    api_key = os.getenv("GEMINI_API_KEY")

    # 1. ALWAYS consult real-time available buses from transitstat.us
    telemetry = await get_live_telemetry()
    buses = telemetry.get("buses", []) if isinstance(telemetry, dict) else []
    
    active_routes = sorted(list(set(b["route"] for b in buses if b.get("route"))))
    now = datetime.now()
    now_str = now.strftime("%A, %I:%M %p")
    is_weekend = now.weekday() >= 5
    
    # Resolve student's exact current location & closest boarding bus stop
    user_loc = req.current_location or req.current_campus or "Busch Student Center"
    closest_stop_to_user = None
    user_loc_clean = user_loc.lower().strip()
    for b_name, b_meta in CAMPUS_BUILDINGS.items():
        if b_name in user_loc_clean or user_loc_clean in b_name:
            closest_stop_to_user = b_meta.get("stop")
            break
    boarding_stop_hint = closest_stop_to_user or user_loc
    
    # Compile real-time vehicle digest
    bus_lines = []
    for b in buses:
        route = b.get("route", "BUS")
        nxt = b.get("next_stop", "En Route")
        eta = b.get("eta_mins", 3)
        campus = b.get("campus", "Rutgers")
        up = b.get("upcoming_stops", [])
        up_str = ", ".join([f"{u.get('station')} (~{u.get('eta_mins')}m)" for u in up[:5]])
        bus_lines.append(
            f"- Route '{route}' (Bus #{b.get('id', '')} at/near {campus}): Next stop is '{nxt}' (ETA ~{eta}m). Following upcoming stops: {up_str or 'En Route'}"
        )
    telemetry_summary = "\n".join(bus_lines) if bus_lines else "No buses actively broadcasting GPS right now."

    # If GEMINI_API_KEY is configured, ask Gemini with the mandatory active fleet context
    if api_key and api_key != "YOUR_GEMINI_API_KEY":
        try:
            from google import genai
            client = genai.Client(api_key=api_key)
            model_name = os.getenv("GEMINI_MODEL") or "gemini-3.5-flash-lite"
            
            prompt = f"""
You are ScarletHop, the expert Rutgers University real-time transit AI assistant.
Current Time: {now_str} ({'Weekend Service' if is_weekend else 'Weekday Regular Service'}).
Student Current Campus: {req.current_campus}
Student Exact Current Location / Building: {user_loc}
Nearest Boarding Bus Stop to Student: {boarding_stop_hint}
{f"Student Live GPS Coordinates: {req.coords}" if req.coords else ""}
Student's Query: "{req.query}"

=== LIVE FLEET TELEMETRY FROM TRANSITSTAT.US ===
Active Routes Operating Right Now: {', '.join(active_routes) if active_routes else 'No live buses detected'}
(CRITICAL: Any route NOT listed above is OFFLINE and NOT RUNNING right now. DO NOT recommend inactive routes. For example, on weekends do NOT recommend weekday-only routes like LX, B, A, H, F, EE, REXB, REXL.)

Real-Time Vehicles & Upcoming Arrivals:
{telemetry_summary}

=== MANDATORY RULES ===
1. ALWAYS consult the available buses from transitstat.us above before answering.
2. Consider the student's exact current location ({user_loc}) and closest boarding stop ({boarding_stop_hint}). Direct them from there.
3. Recommend ONLY active routes from the list above. If user is travelling between campuses, select the optimal operating route that serves their journey.
4. Identify the boarding stop nearest to the student, the exact incoming bus route, its real live ETA in minutes from the predictions above, and where to get off/walk to reach their destination.
5. Keep the answer friendly, concise, and 2-3 sentences.
6. Return your answer in valid JSON format with EXACTLY these keys:
{{
  "reply": "<Friendly 2-3 sentence answer with the route name in bold, boarding stop, real-time ETA, and travel instructions>",
  "recommended_route": "<Exact route name from the active routes list, e.g. Weekend 1, Weekend 2, LX, etc.>",
  "eta_mins": <Integer number of minutes until the recommended bus reaches the boarding stop>
}}
"""
            response = client.models.generate_content(
                model=model_name,
                contents=prompt
            )
            raw_text = response.text.strip()
            
            # Clean possible markdown block
            cleaned = re.sub(r"^```(?:json)?\s*", "", raw_text, flags=re.MULTILINE)
            cleaned = re.sub(r"```$", "", cleaned, flags=re.MULTILINE).strip()
            
            try:
                parsed = json.loads(cleaned)
                reply = parsed.get("reply", "").strip()
                rec_route = parsed.get("recommended_route", "").strip()
                eta_val = parsed.get("eta_mins")
                
                # Verify rec_route is in active_routes or normalize
                matching_route = next((r for r in active_routes if r.lower() in rec_route.lower() or rec_route.lower() in r.lower()), None)
                if matching_route:
                    rec_route = matching_route
                elif active_routes:
                    rec_route = active_routes[0]

                try:
                    eta_mins = int(eta_val) if eta_val is not None else 3
                except Exception:
                    eta_mins = 3

                if reply and rec_route:
                    return {
                        "reply": reply,
                        "recommended_route": rec_route,
                        "eta_mins": eta_mins
                    }
            except Exception:
                pass
        except Exception as e:
            print("Gemini copilot error:", e)

    # Deterministic fallback consulting live buses
    chosen_bus = None
    if buses:
        for b in buses:
            b_campus = (b.get("campus") or "").lower()
            if req.current_campus and (req.current_campus.lower() in b_campus or b_campus in req.current_campus.lower()):
                chosen_bus = b
                break
        if not chosen_bus:
            chosen_bus = buses[0]

    if chosen_bus:
        route_name = chosen_bus.get("route", active_routes[0] if active_routes else "Bus")
        eta = chosen_bus.get("eta_mins", 3)
        stop_name = boarding_stop_hint or chosen_bus.get("next_stop", user_loc)
        return {
            "reply": f"Based on live transitstat.us tracking, catch the **{route_name}** at or near {stop_name} (arriving in ~{eta} min). It is currently operating and will connect you along the route.",
            "recommended_route": route_name,
            "eta_mins": eta
        }

    return {
        "reply": "No live buses are currently reported in service by transitstat.us. Please check the campus shuttle schedule or check back shortly.",
        "recommended_route": "Weekend 1" if is_weekend else "LX",
        "eta_mins": 5
    }

@app.post("/api/plan")
def calculate_commute(plan: CommutePlanRequest):
    routes = get_commute_routes(plan.origin_campus, plan.destination_campus, plan.target_arrival_time)
    
    primary = routes[0]["name"] if routes else "Direct Route"
    alts = [r["name"] for r in routes[1:]] if len(routes) > 1 else []
    base_mins = routes[0]["estimated_minutes"] if routes else 10
    rush_mins = routes[0]["rush_hour_minutes"] if routes else 15
    
    return {
        "origin": plan.origin_campus,
        "destination": plan.destination_campus,
        "routes": routes,
        "primary_route": primary,
        "alternative_routes": alts,
        "base_minutes": base_mins,
        "rush_hour_minutes": rush_mins,
        "advice": f"Recommended: {primary} (~{base_mins} mins). Found {len(routes)} viable options ranked by time to destination."
    }

SPEED_OPTIONS = ["Mosey", "Wander", "Stroll", "Dash", "Zoom", "2.0 mph", "2.5 mph", "3.0 mph", "3.5 mph"]
DISTANCE_OPTIONS = ["Less Than 1/4 A Mile", "1/2 A Mile", "3/4 A Mile", "1 Mile", "A Mile or More", "1.5 Miles+"]

class SignupRequest(BaseModel):
    username: str
    password: str
    walking_speed: Optional[str] = "2.5 mph"
    prefer_walking: Optional[bool] = True
    max_walking_distance: Optional[str] = "1 Mile"
    avoid_bad_weather: Optional[bool] = True
    avoid_rain: Optional[bool] = True
    avoid_snow: Optional[bool] = True

@app.post("/api/signup")
def signup(req: SignupRequest):
    username = req.username.strip().lower()

    if username == "":
        raise HTTPException(status_code=400, detail="Username can't be empty.")
    if len(username) < 3:
        raise HTTPException(status_code=400, detail="Username must be at least 3 characters.")
    if req.password.strip() == "":
        raise HTTPException(status_code=400, detail="Password can't be empty.")

    users = load_users()

    if username in users:
        raise HTTPException(status_code=409, detail="Username already in use.")

    hashed_password = hashlib.sha256(req.password.strip().encode()).hexdigest()

    users[username] = {
        "password": hashed_password,
        "walking_speed": req.walking_speed or "2.5 mph",
        "prefer_walking": True if req.prefer_walking is None else req.prefer_walking,
        "max_walking_distance": req.max_walking_distance or "1 Mile",
        "avoid_bad_weather": True if req.avoid_bad_weather is None else req.avoid_bad_weather,
        "avoid_rain": True if req.avoid_rain is None else req.avoid_rain,
        "avoid_snow": True if req.avoid_snow is None else req.avoid_snow,
        "classes": []
    }
    save_users(users)

    return {"status": "success", "username": username}

class LoginRequest(BaseModel):
    username: str
    password: str

@app.post("/api/login")
def login(req: LoginRequest):
    username = req.username.strip().lower()
    users = load_users()

    if username not in users:
        raise HTTPException(status_code=401, detail="Incorrect username or password.")

    hashed_password = hashlib.sha256(req.password.strip().encode()).hexdigest()

    if users[username]["password"] != hashed_password:
        raise HTTPException(status_code=401, detail="Incorrect username or password.")

    return {"status": "success", "username": username}

@app.post("/api/schedule/upload")
async def upload_schedule(file: UploadFile = File(...), username: Optional[str] = Form(None)):
    # 1. Clean the username if provided
    clean_user = username.strip().lower() if username else None

    # 2. Verify user exists if username was specified
    if clean_user and clean_user not in load_users():
        raise HTTPException(status_code=404, detail="User not found.")

    # 3. Read the uploaded file
    contents = await file.read()
    filename = (file.filename or "").lower()
    content_type = (file.content_type or "").lower()

    # 4. Choose parser: .ics calendar or image OCR
    if filename.endswith(".ics") or "calendar" in content_type or b"BEGIN:VCALENDAR" in contents[:500]:
        try:
            text = contents.decode("utf-8", errors="ignore")
            result = await asyncio.to_thread(parse_ics_schedule, text)
        except Exception as e:
            result = {
                "status": "error",
                "message": f"Failed to parse .ics calendar file: {str(e)}",
                "classes": []
            }
    else:
        result = await asyncio.to_thread(parse_schedule_with_gemini, contents, file.content_type or "image/png")

    # 5. If parsing succeeded and a username was provided, save classes to the user's SQL profile
    if result.get("status") == "success" and clean_user:
        users = load_users()
        if clean_user in users:
            users[clean_user]["classes"] = result.get("classes", [])
            save_users(users)

    # 6. Return the result
    return result


@app.get("/api/database/status")
def get_database_status():
    raw_url = os.getenv("DATABASE_URL") or os.getenv("TIGERDATA_DATABASE_URL", "")
    provider = "TigerData (PostgreSQL Cloud)" if raw_url else "SQLite (Local File Fallback)"
    users = load_users()
    return {
        "status": "connected",
        "provider": provider,
        "is_tigerdata": bool(raw_url),
        "database_url_configured": bool(raw_url),
        "registered_users_count": len(users),
        "usernames": list(users.keys())
    }


@app.get("/api/users")
def list_registered_users():
    users = load_users()
    return {
        "count": len(users),
        "users": [
            {
                "username": u,
                "walking_speed": data.get("walking_speed"),
                "classes_count": len(data.get("classes", []))
            }
            for u, data in users.items()
        ]
    }


@app.get("/api/user/{username}")
def get_user_profile(username: str):
    clean = username.strip().lower()
    users = load_users()
    if clean not in users:
        raise HTTPException(status_code=404, detail="User not found.")
    u_data = users[clean]
    return {
        "username": clean,
        "walking_speed": u_data.get("walking_speed", "2.5 mph"),
        "prefer_walking": u_data.get("prefer_walking", True),
        "max_walking_distance": u_data.get("max_walking_distance", "1 Mile"),
        "avoid_bad_weather": u_data.get("avoid_bad_weather", True),
        "avoid_rain": u_data.get("avoid_rain", True),
        "avoid_snow": u_data.get("avoid_snow", True),
        "classes": u_data.get("classes", [])
    }


class PreferencesUpdateRequest(BaseModel):
    walking_speed: Optional[str] = None
    prefer_walking: Optional[bool] = None
    max_walking_distance: Optional[str] = None
    avoid_bad_weather: Optional[bool] = None
    avoid_rain: Optional[bool] = None
    avoid_snow: Optional[bool] = None


@app.post("/api/user/{username}/preferences")
def update_user_preferences(username: str, req: PreferencesUpdateRequest):
    clean = username.strip().lower()
    users = load_users()
    if clean not in users:
        raise HTTPException(status_code=404, detail="User not found.")

    if req.walking_speed is not None:
        users[clean]["walking_speed"] = req.walking_speed
    if req.prefer_walking is not None:
        users[clean]["prefer_walking"] = req.prefer_walking
    if req.max_walking_distance is not None:
        users[clean]["max_walking_distance"] = req.max_walking_distance
    if req.avoid_bad_weather is not None:
        users[clean]["avoid_bad_weather"] = req.avoid_bad_weather
    if req.avoid_rain is not None:
        users[clean]["avoid_rain"] = req.avoid_rain
    if req.avoid_snow is not None:
        users[clean]["avoid_snow"] = req.avoid_snow

    save_users(users)
    return {
        "status": "success",
        "username": clean,
        "preferences": {
            "walking_speed": users[clean].get("walking_speed", "2.5 mph"),
            "prefer_walking": users[clean].get("prefer_walking", True),
            "max_walking_distance": users[clean].get("max_walking_distance", "1 Mile"),
            "avoid_bad_weather": users[clean].get("avoid_bad_weather", True),
            "avoid_rain": users[clean].get("avoid_rain", True),
            "avoid_snow": users[clean].get("avoid_snow", True)
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)

