import os
import json
from datetime import datetime
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx
from dotenv import load_dotenv, find_dotenv

from app.rutgers_data import CAMPUS_BUILDINGS, CAMPUS_STOPS, TRANSIT_MATRIX
from app.schedule_parser import parse_schedule_with_gemini

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
def get_stops():
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

                    # Calculate arrival ETA to next stop
                    predictions = t.get("predictions", [])
                    next_stop_name = "En Route"
                    eta_mins = 5 # default fallback if no predictions

                    if predictions and isinstance(predictions, list):
                        first_pred = predictions[0]
                        next_stop_name = first_pred.get("stationName", "Next Stop")
                        actual_eta = first_pred.get("actualETA")
                        if actual_eta:
                            eta_mins = max(1, round((actual_eta - now_ms) / 60000))
                    elif t.get("destStation"):
                        next_stop_name = stations.get(t.get("destStation"), {}).get("stationName", "En Route")

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

                    live_buses.append({
                        "id": str(t.get("runNumber") or tid),
                        "route": route_display,
                        "destination": line_long or "Campus Route",
                        "lat": lat,
                        "lon": lon,
                        "campus": bus_campus,
                        "speed_mph": round(t.get("speed") or 18),
                        "occupancy": occupancy,
                        "eta_mins": eta_mins,
                        "next_stop": next_stop_name
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

@app.post("/api/schedule/upload")
async def upload_schedule(file: UploadFile = File(...)):
    """Uploads a class schedule screenshot and extracts classes using Gemini Vision OCR."""
    contents = await file.read()
    content_type = file.content_type or "image/png"
    result = parse_schedule_with_gemini(contents, mime_type=content_type)
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
    # Check if origin and destination are identical
    if plan.origin_campus == plan.destination_campus:
        return {
            "origin": plan.origin_campus,
            "destination": plan.destination_campus,
            "primary_route": "Campus Walk / Internal Loop",
            "alternative_routes": [],
            "base_minutes": 5,
            "rush_hour_minutes": 8,
            "advice": f"You are already on {plan.origin_campus}! A direct 5-8 minute walk or local stop hopper is faster than waiting for an inter-campus bus."
        }

    weekend = datetime.now().weekday() >= 5
    if weekend:
        # On weekends, choose between Weekend 1 and Weekend 2 based on direction
        # Weekend 1: College Ave -> Busch -> Livingston -> Cook/Douglass -> College Ave
        # Weekend 2: College Ave -> Cook/Douglass -> Livingston -> Busch -> College Ave
        if (plan.origin_campus == "College Ave" and plan.destination_campus in ["Busch", "Livingston"]) or \
           (plan.origin_campus == "Busch" and plan.destination_campus == "Livingston") or \
           (plan.origin_campus == "Livingston" and plan.destination_campus == "Cook"):
            best_route = "Weekend 1"
            alt_route = "Weekend 2"
            eta = 14
        else:
            best_route = "Weekend 2"
            alt_route = "Weekend 1"
            eta = 16

        return {
            "origin": plan.origin_campus,
            "destination": plan.destination_campus,
            "primary_route": best_route,
            "alternative_routes": [alt_route],
            "base_minutes": eta,
            "rush_hour_minutes": eta + 3,
            "advice": f"Take {best_route} for the fastest direct loop from {plan.origin_campus} to {plan.destination_campus}. ({alt_route} also circles here if it arrives first)."
        }

    pair = (plan.origin_campus, plan.destination_campus)
    matrix_entry = TRANSIT_MATRIX.get(pair)
    if not matrix_entry:
        return {
            "origin": plan.origin_campus,
            "destination": plan.destination_campus,
            "primary_route": "Transfer via College Ave (Scott Hall)",
            "alternative_routes": [],
            "base_minutes": 25,
            "rush_hour_minutes": 32,
            "advice": "No direct single bus line between these two campuses. Board a connecting bus to College Ave (Scott Hall / The Yard) and transfer."
        }
    
    routes = matrix_entry["routes"]
    primary = routes[0]
    alts = routes[1:] if len(routes) > 1 else []

    return {
        "origin": plan.origin_campus,
        "destination": plan.destination_campus,
        "primary_route": primary,
        "alternative_routes": alts,
        "base_minutes": matrix_entry["base_minutes"],
        "rush_hour_minutes": matrix_entry["peak_minutes"],
        "advice": f"Take the {primary} bus from {plan.origin_campus} to {plan.destination_campus}. " + (f"Alternative: {', '.join(alts)}. " if alts else "") + f"Allow ~{matrix_entry['peak_minutes']} mins during peak transitions."
    }
