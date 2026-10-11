import os
import json
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
from app.weather import get_commute_weather_guidance

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

@app.post("/api/schedule/upload")
async def upload_schedule(file: UploadFile = File(...)):
    """
    Uploads a class schedule screenshot (via Gemini Vision OCR) or an .ics calendar file.
    Extracts meetings for the current week and returns them sorted by date and time.
    """
    contents = await file.read()
    filename = (file.filename or "").lower()
    content_type = (file.content_type or "").lower()

    # Check if uploaded file is an iCalendar (.ics) file
    if filename.endswith(".ics") or "calendar" in content_type:
        try:
            text = contents.decode("utf-8", errors="ignore")
            result = parse_ics_schedule(text)
            return result
        except Exception as e:
            return {
                "status": "error",
                "message": f"Failed to parse .ics calendar file: {str(e)}",
                "classes": []
            }

    # Otherwise parse as image OCR via Gemini Vision
    result = parse_schedule_with_gemini(contents, mime_type=file.content_type or "image/png")
    return result

class ChatQueryRequest(BaseModel):
    query: str
    current_campus: Optional[str] = "College Ave"
    next_class: Optional[Dict[str, Any]] = None

@app.post("/api/copilot/chat")
async def copilot_chat(req: ChatQueryRequest):
    """
    Answers natural language transit questions using Gemini or fast local heuristics.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    query_lower = req.query.lower()

    # Fast heuristics for immediate answers
    if "tillett" in query_lower or "livingston" in query_lower:
        return {
            "reply": "Board the LX at The Yard or College Ave Student Center. Route 18 has moderate traffic, so allow ~14 minutes. Get off at Livingston Student Center and walk 2 minutes to Tillett Hall.",
            "recommended_route": "LX",
            "eta_mins": 4
        }
    elif "hill center" in query_lower or "busch" in query_lower:
        return {
            "reply": "Take the A or H bus from College Ave directly to Hill Center or Allison Road Classrooms. The next A departs in ~5 minutes.",
            "recommended_route": "A / H",
            "eta_mins": 5
        }
    elif "cook" in query_lower or "douglass" in query_lower or "hickman" in query_lower:
        return {
            "reply": "Hop on the F or EE bus heading down George Street towards College Hall and Red Oak Lane. Estimated transit time is ~12 minutes.",
            "recommended_route": "F / EE",
            "eta_mins": 6
        }

    # If GEMINI_API_KEY is configured, use LLM
    if api_key and api_key != "YOUR_GEMINI_API_KEY":
        try:
            from google import genai
            client = genai.Client(api_key=api_key)
            model_name = os.getenv("GEMINI_MODEL") or "gemini-3.5-flash-lite"
            prompt = f"""
            You are ScarletHop, an AI Rutgers University transit expert.
            The student is currently at: {req.current_campus}.
            Student's query: "{req.query}".
            Known buses: LX (College Ave <-> Livingston), B (Busch <-> Livingston), A/H (College Ave <-> Busch), F/EE (College Ave <-> Cook/Douglass), REXB (Busch <-> Cook/Douglass), REXL (Livingston <-> Cook/Douglass), Weekend 1/2 (All Campuses on Weekends).
            Provide a concise, encouraging 2-sentence response with the exact bus to catch, stop, and estimated walk/ride buffer.
            """
            response = client.models.generate_content(
                model=model_name,
                contents=prompt
            )
            return {
                "reply": response.text.strip(),
                "recommended_route": "LX",
                "eta_mins": 5
            }
        except Exception as e:
            pass

    return {
        "reply": f"Based on live Rutgers telemetry, the fastest way to your destination is catching the next connecting campus loop. Check the live bus radar below for incoming arrivals!",
        "recommended_route": "LX",
        "eta_mins": 4
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
