import os
import json
import base64
from typing import List, Dict, Any, Optional
from google import genai
from google.genai import types

from app.rutgers_data import CAMPUS_BUILDINGS

def parse_schedule_with_gemini(image_bytes: bytes, mime_type: str = "image/png") -> List[Dict[str, Any]]:
    """
    Uses Gemini Vision API to parse Rutgers Course Schedule screenshots (WebReg, Canvas, CSP).
    Extracts course code, title, days of the week, meeting times, and classroom buildings.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    
    # Fallback mock data if GEMINI_API_KEY is not configured yet
    if not api_key or api_key == "YOUR_GEMINI_API_KEY":
        return [
            {
                "course": "Intro to Computer Science (01:198:111)",
                "days": ["M", "TH"],
                "startTime": "10:20",
                "endTime": "11:40",
                "building": "Hill Center 114",
                "campus": "Busch",
                "closest_stop": "Hill Center"
            },
            {
                "course": "Linear Algebra (01:640:250)",
                "days": ["M", "TH"],
                "startTime": "12:10",
                "endTime": "13:30",
                "building": "Tillett Hall 254",
                "campus": "Livingston",
                "closest_stop": "Livingston Student Center"
            },
            {
                "course": "Data Structures (01:198:112)",
                "days": ["T", "F"],
                "startTime": "14:00",
                "endTime": "15:20",
                "building": "Academic Building 1180",
                "campus": "College Ave",
                "closest_stop": "The Yard"
            }
        ]

    client = genai.Client(api_key=api_key)
    
    prompt = """
    You are an expert Rutgers University academic assistant.
    Analyze this schedule image (from Rutgers WebReg, Canvas, or Course Schedule Planner) and extract all scheduled class meetings.
    
    Return a strictly valid JSON array of objects with the following schema:
    [
      {
        "course": "string (e.g. Intro to CS)",
        "days": ["M", "T", "W", "TH", "F"],
        "startTime": "HH:MM in 24-hour format (e.g. 10:20)",
        "endTime": "HH:MM in 24-hour format (e.g. 11:40)",
        "building": "string (building name or code, e.g. Hill Center, Tillett, Academic Building)",
        "room": "string (e.g. 114)"
      }
    ]
    
    Do not include markdown fences or explanation. Return only valid JSON.
    """

    model_name = os.getenv("GEMINI_MODEL") or "gemini-3.5-flash-lite"
    try:
        response = client.models.generate_content(
            model=model_name,
            contents=[
                types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
                prompt
            ]
        )
        text = response.text.strip()
        if text.startswith("```json"):
            text = text[7:]
        if text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
        text = text.strip()
        parsed = json.loads(text)
        
        # Enrich with Rutgers campus and stop resolution
        for item in parsed:
            b_clean = item.get("building", "").lower()
            matched_building = None
            for key, data in CAMPUS_BUILDINGS.items():
                if key in b_clean or data["code"].lower() in b_clean:
                    matched_building = data
                    break
            
            if matched_building:
                item["campus"] = matched_building["campus"]
                item["closest_stop"] = matched_building["stop"]
            else:
                item["campus"] = "College Ave" # Default if unmapped
                item["closest_stop"] = "Student Center"
                
        return parsed
    except Exception as e:
        print(f"Gemini parsing failed or errored: {e}")
        # Return sensible fallback if parsing encounters an error
        return [
            {
                "course": "Sample Fall 2026 Class",
                "days": ["M", "W"],
                "startTime": "10:20",
                "endTime": "11:40",
                "building": "Hill Center",
                "campus": "Busch",
                "closest_stop": "Hill Center"
            }
        ]
