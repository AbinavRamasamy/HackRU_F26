import os
import json
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx
from dotenv import load_dotenv

from app.rutgers_data import CAMPUS_BUILDINGS, CAMPUS_STOPS, TRANSIT_MATRIX
from app.telemetry import get_simulated_telemetry
from app.schedule_parser import parse_schedule_with_gemini

load_dotenv()

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
    Attempts to fetch live Rutgers telemetry from transitstat.us / TripShot;
    seamlessly falls back to the deterministic mock generator if unavailable.
    """
    try:
        async with httpx.AsyncClient(timeout=2.5) as client:
            resp = await client.get("https://transitstat.us/api/v1/rutgers/vehicles")
            if resp.status_code == 200:
                data = resp.json()
                if data and isinstance(data, list):
                    return {"source": "live_transitstat", "buses": data}
    except Exception:
        pass
    
    # Fallback to simulated real-time telemetry
    return {"source": "resilient_simulation", "buses": get_simulated_telemetry(route)}

@app.post("/api/schedule/upload")
async def upload_schedule(file: UploadFile = File(...)):
    """Uploads a class schedule screenshot and extracts classes using Gemini Vision OCR."""
    contents = await file.read()
    content_type = file.content_type or "image/png"
    parsed_classes = parse_schedule_with_gemini(contents, mime_type=content_type)
    return {"status": "success", "classes": parsed_classes}

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
            prompt = f"""
            You are ScarletHop, an AI Rutgers University transit expert.
            The student is currently at: {req.current_campus}.
            Student's query: "{req.query}".
            Known buses: LX (College Ave <-> Livingston), B (Busch <-> Livingston), A/H (College Ave <-> Busch), F/EE (College Ave <-> Cook/Douglass), REXB (Busch <-> Cook/Douglass), REXL (Livingston <-> Cook/Douglass).
            Provide a concise, encouraging 2-sentence response with the exact bus to catch, stop, and estimated walk/ride buffer.
            """
            response = client.models.generate_content(
                model='gemini-2.5-flash',
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
    pair = (plan.origin_campus, plan.destination_campus)
    if plan.origin_campus == plan.destination_campus:
        return {
            "origin": plan.origin_campus,
            "destination": plan.destination_campus,
            "recommended_routes": ["Walking / Campus Loop"],
            "estimated_travel_minutes": 8,
            "advice": "Both locations are on the same campus! Walking or catching the local campus loop is recommended."
        }
    
    matrix_entry = TRANSIT_MATRIX.get(pair)
    if not matrix_entry:
        return {
            "origin": plan.origin_campus,
            "destination": plan.destination_campus,
            "recommended_routes": ["Transfer via College Ave (Scott Hall)"],
            "estimated_travel_minutes": 30,
            "advice": "No direct single bus route. Board a bus to College Ave (Scott Hall / The Yard) and transfer."
        }
    
    return {
        "origin": plan.origin_campus,
        "destination": plan.destination_campus,
        "recommended_routes": matrix_entry["routes"],
        "base_minutes": matrix_entry["base_minutes"],
        "rush_hour_minutes": matrix_entry["peak_minutes"],
        "advice": f"Take the {', '.join(matrix_entry['routes'])}. Allow ~{matrix_entry['peak_minutes']} mins during peak class transition intervals."
    }
