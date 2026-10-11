import os
import json
import base64
import re
from typing import List, Dict, Any, Optional
from google import genai
from google.genai import types

from app.rutgers_data import CAMPUS_BUILDINGS, find_building

DAY_MAP = {
    "M": "M", "MON": "M", "MONDAY": "M",
    "T": "T", "TU": "T", "TUE": "T", "TUES": "T", "TUESDAY": "T",
    "W": "W", "WED": "W", "WEDNESDAY": "W",
    "TH": "TH", "R": "TH", "H": "TH", "THU": "TH", "THUR": "TH", "THURSDAY": "TH",
    "F": "F", "FRI": "F", "FRIDAY": "F",
    "S": "S", "SA": "S", "SAT": "S", "SATURDAY": "S",
    "SU": "SU", "SUN": "SU", "SUNDAY": "SU"
}

DAY_ORDER = {"M": 1, "T": 2, "W": 3, "TH": 4, "F": 5, "S": 6, "SU": 7}

def normalize_days(raw: Any) -> List[str]:
    """
    Parses and standardizes day representations (e.g. 'M, TH', 'MWF', 'TR', ['M', 'TH'], 'H')
    into sorted canonical Rutgers academic days: ['M', 'T', 'W', 'TH', 'F', 'S', 'SU'].
    """
    if not raw:
        return ["M"]
    extracted = []
    
    if isinstance(raw, list):
        for item in raw:
            extracted.extend(normalize_days(item))
    elif isinstance(raw, str):
        cleaned = raw.replace("/", ",").replace("&", ",").strip()
        tokens = [t.strip() for t in cleaned.split(",") if t.strip()]
        for token in tokens:
            subtokens = token.split()
            for sub in subtokens:
                upper = sub.upper()
                if upper in DAY_MAP:
                    extracted.append(DAY_MAP[upper])
                elif upper == "MWF":
                    extracted.extend(["M", "W", "F"])
                elif upper in ["TR", "TTH"]:
                    extracted.extend(["T", "TH"])
                elif upper == "MR":
                    extracted.extend(["M", "TH"])
                elif upper == "TF":
                    extracted.extend(["T", "F"])
                else:
                    i = 0
                    while i < len(upper):
                        if upper[i:i+2] in ["TH", "SU", "SA"]:
                            extracted.append(DAY_MAP.get(upper[i:i+2], upper[i:i+2]))
                            i += 2
                        elif upper[i] in DAY_MAP:
                            extracted.append(DAY_MAP[upper[i]])
                            i += 1
                        else:
                            i += 1

    unique_days = list(dict.fromkeys(extracted))
    sorted_days = sorted(unique_days, key=lambda d: DAY_ORDER.get(d, 99))
    return sorted_days if sorted_days else ["M"]

def normalize_time(time_str: str) -> str:
    """Standardizes time string to 24-hour HH:MM format."""
    if not time_str:
        return ""
    t = time_str.strip().upper()
    # If 12-hour format e.g. 10:20 AM or 1:30 PM
    match = re.search(r"(\d{1,2}):(\d{2})\s*(AM|PM)?", t)
    if match:
        hours = int(match.group(1))
        mins = match.group(2)
        meridiem = match.group(3)
        if meridiem == "PM" and hours < 12:
            hours += 12
        elif meridiem == "AM" and hours == 12:
            hours = 0
        return f"{hours:02d}:{mins}"
    return t

def parse_schedule_with_gemini(image_bytes: bytes, mime_type: str = "image/png") -> Dict[str, Any]:
    """
    Uses Gemini Vision API to parse Rutgers Course Schedule screenshots (WebReg, Canvas, CSP).
    Extracts course code, title, days of the week, meeting times, and classroom buildings.
    Groups identical meetings (same course, time, and location) into a single entry with combined days.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    
    # Check if GEMINI_API_KEY is missing or blank
    if not api_key or api_key.strip() in ["", "your_gemini_api_key_here", "YOUR_GEMINI_API_KEY"]:
        print("[ScheduleOCR] GEMINI_API_KEY is not set or empty in .env.")
        return {
            "status": "missing_api_key",
            "message": "GEMINI_API_KEY is not set in .env. Please set GEMINI_API_KEY in your .env file to parse schedule screenshots.",
            "classes": []
        }

    try:
        client = genai.Client(api_key=api_key.strip())
        model_name = os.getenv("GEMINI_MODEL") or "gemini-3.5-flash-lite"
        print(f"[ScheduleOCR] Analyzing image with Gemini model: {model_name}...")

        prompt = """
        You are an expert Rutgers University academic assistant.
        Analyze this Rutgers course schedule image (from WebReg, Canvas, or Course Schedule Planner) and extract all scheduled class meetings.
        
        CRITICAL EXTRACTION & GROUPING RULES:
        1. Extract the course title and code (e.g. "Intro to Computer Science (01:198:111)").
        2. Extract meeting days using standard abbreviations: "M", "T", "W", "TH", "F", "S", "SU" (or "Online"). Note: 'H' or 'R' at Rutgers stands for 'TH' (Thursday).
        3. Extract start and end times in 24-hour format (e.g. "10:20", "11:40").
        4. Extract the physical classroom location, building name, and room number (e.g. "Hill Center 114", "Tillett Hall 254", "SEC 111", "Academic Building 1180").
        5. CRITICAL GROUPING: When a course meets at the same time and in the same location/building on multiple days (for example, Monday and Thursday 10:20-11:40 in Hill Center 114), GROUP THEM INTO A SINGLE ENTRY with all days combined (e.g. ["M", "TH"] and "M, TH"). Do NOT return separate entries for M and TH!
        
        Return a strictly valid JSON array of objects with the following schema:
        [
          {
            "course": "string (e.g. Intro to Computer Science 01:198:111)",
            "days": ["M", "TH"],
            "days_display": "M, TH",
            "startTime": "HH:MM in 24-hour format (e.g. 10:20)",
            "endTime": "HH:MM in 24-hour format (e.g. 11:40)",
            "building": "string (e.g. Hill Center 114)",
            "room": "string (e.g. 114)",
            "location": "string (e.g. Hill Center 114)"
          }
        ]
        
        Do not include markdown fences or explanation. Return only valid JSON.
        """

        response = client.models.generate_content(
            model=model_name,
            contents=[
                types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
                prompt
            ]
        )
        text = response.text.strip()
        print(f"[ScheduleOCR] Gemini response text preview: {text[:150]}")

        if text.startswith("```json"):
            text = text[7:]
        if text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
        text = text.strip()
        parsed = json.loads(text)
        
        # Post-processing: Group identical (course, building, time) across separate day entries
        grouped_dict = {}
        for item in parsed:
            course = item.get("course", "").strip()
            building = item.get("building", "").strip() or item.get("location", "").strip()
            start = normalize_time(item.get("startTime", ""))
            end = normalize_time(item.get("endTime", ""))
            
            raw_days = item.get("days", [])
            normalized_d = normalize_days(raw_days)

            # Course key normalization (remove section suffix like :01 for grouping identical meetings)
            norm_course = re.sub(r":\d{2,3}$", "", course.lower()).strip()
            norm_bldg = building.lower()
            key = (norm_course, norm_bldg, start, end)

            if key not in grouped_dict:
                grouped_dict[key] = {
                    "course": course,
                    "building": building,
                    "room": item.get("room", ""),
                    "startTime": start,
                    "endTime": end,
                    "days": normalized_d
                }
            else:
                for d in normalized_d:
                    if d not in grouped_dict[key]["days"]:
                        grouped_dict[key]["days"].append(d)
                # Resort by academic calendar order
                grouped_dict[key]["days"] = sorted(
                    grouped_dict[key]["days"], 
                    key=lambda x: DAY_ORDER.get(x, 99)
                )

        consolidated_classes = list(grouped_dict.values())

        # Enrich with Rutgers campus, stop resolution, formatted location, and days_display
        for item in consolidated_classes:
            item["days_display"] = ", ".join(item["days"])
            matched_building = find_building(item.get("building", ""))
            
            if matched_building:
                item["campus"] = matched_building["campus"]
            else:
                item["campus"] = "College Ave" # Default if unmapped

            # Ensure clear, prominent location string
            bldg_name = item.get("building", "")
            campus_name = item.get("campus", "")
            if campus_name and campus_name.lower() not in bldg_name.lower():
                item["location"] = f"{bldg_name} ({campus_name})"
            else:
                item["location"] = bldg_name
                
        # Order strictly by Date (earliest day of the week) and Time
        def class_sort_key(cls_item):
            min_day = min((DAY_ORDER.get(d, 99) for d in cls_item.get("days", [])), default=99)
            return (min_day, cls_item.get("startTime", "00:00"))

        consolidated_classes.sort(key=class_sort_key)

        return {"status": "success", "classes": consolidated_classes}
    except Exception as e:
        print(f"[ScheduleOCR] Gemini parsing error: {e}")
        return {
            "status": "error",
            "message": f"Gemini Vision parsing failed: {str(e)}",
            "classes": []
        }

