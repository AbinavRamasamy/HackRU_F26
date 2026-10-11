# Rutgers Calendar .ics Schedule Parser
import os
import re
import json
from datetime import datetime, timedelta, date
from typing import List, Dict, Any, Optional

from google import genai

from app.rutgers_data import CAMPUS_BUILDINGS, find_building
from app.schedule_parser import DAY_ORDER, normalize_time, normalize_days

ICS_DAY_MAP = {
    "MO": "M", "M": "M",
    "TU": "T", "T": "T",
    "WE": "W", "W": "W",
    "TH": "TH", "R": "TH", "H": "TH",
    "FR": "F", "F": "F",
    "SA": "S", "S": "S",
    "SU": "SU", "U": "SU"
}

WEEKDAY_TO_DAY = ["M", "T", "W", "TH", "F", "S", "SU"]

IGNORE_KEYWORDS = [
    "birthday", "bday", "b-day", "anniversary", "holiday", 
    "observed", "day off", "vacation", "no classes", "reminder", 
    "task", "doctor", "dentist", "payday", "flight", "check-in",
    "garbage", "trash", "recycle", "election",
    "final exam", "midterm", "quiz", "reading day"
]

import html

def extract_zoom_link(ev: Dict[str, str]) -> Optional[str]:
    """Extracts Zoom or video conferencing URL from event properties."""
    zoom_pattern = re.compile(
        r"https?://[a-zA-Z0-9.\-_]*(?:zoom\.us|webex\.com|teams\.microsoft\.com|meet\.google\.com)/[^\s\"'<>\\,;)]+",
        re.I
    )
    for key, val in ev.items():
        if not val:
            continue
        # Unescape RFC 5545 backslashes and HTML entities
        clean_val = html.unescape(val)
        clean_val = clean_val.replace(r"\:", ":").replace(r"\/", "/").replace(r"\?", "?").replace(r"\=", "=").replace(r"\&", "&")
        match = zoom_pattern.search(clean_val)
        if match:
            url = match.group(0).rstrip(".,;)\\")
            return url
    return None

def unfold_ics(content: str) -> List[str]:
    """Unfolds wrapped lines in standard RFC 5545 iCalendar format."""
    lines = []
    for raw in content.replace("\r\n", "\n").replace("\r", "\n").split("\n"):
        if (raw.startswith(" ") or raw.startswith("\t")) and lines:
            lines[-1] += raw[1:]
        else:
            lines.append(raw.strip())
    return lines

def parse_ics_datetime(val: str) -> Optional[datetime]:
    """Parses standard iCalendar DTSTART / DTEND formats containing time."""
    if not val:
        return None
    # Strip property parameters (e.g. TZID=America/New_York:20261012T102000)
    if ":" in val:
        val = val.split(":")[-1].strip()
    val = val.rstrip("Z")
    
    # Format YYYYMMDDTHHMMSS
    match = re.match(r"^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?$", val)
    if match:
        y, m, d, hh, mm = int(match.group(1)), int(match.group(2)), int(match.group(3)), int(match.group(4)), int(match.group(5))
        ss = int(match.group(6)) if match.group(6) else 0
        return datetime(y, m, d, hh, mm, ss)
    
    # If date-only (all day event, no 'T'), return None so all-day events are ignored
    return None

def is_all_day(prop_line: str) -> bool:
    """Detects whether an event is an all-day event or date-only property."""
    if not prop_line:
        return True
    if "VALUE=DATE" in prop_line.upper():
        return True
    val = prop_line.split(":")[-1].strip()
    return "T" not in val

def get_rutgers_semester_bounds(ref_date: date):
    """
    Returns official Rutgers University academic calendar cutoff dates.
    - Fall 2026:
        * Classes Begin: Tuesday, September 1, 2026
        * Regular Classes End: Thursday, December 10, 2026
        * Reading Days: Friday, December 11 – Monday, December 14, 2026
        * Final Exams Period: Tuesday, December 15 – Tuesday, December 22, 2026 (cutoff Dec 23)
    - Spring: January 16 to May 15
    - Summer: May 20 to August 20
    """
    year = ref_date.year
    month = ref_date.month

    if month >= 8:
        # Official Rutgers Fall Semester (starts Sept 1; exams end Dec 23)
        return date(year, 9, 1), date(year, 12, 23), f"Fall {year}"
    elif month <= 5:
        # Spring Semester
        return date(year, 1, 16), date(year, 5, 15), f"Spring {year}"
    else:
        # Summer Session
        return date(year, 5, 20), date(year, 8, 20), f"Summer {year}"


def resolve_locations_with_gemini(classes: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Uses Gemini 3.5 Flash Lite to resolve each class's location:
    - The optimal Google Maps search location query string if it is a physical location
      (e.g. 'Hill Center, Rutgers University, Busch Campus, Piscataway, NJ').
    - Strictly '(Online)' otherwise (for virtual, remote, asynchronous, zoom, canvas, or unspecified classes).
    """
    if not classes:
        return classes

    api_key = os.getenv("GEMINI_API_KEY")
    model_name = os.getenv("GEMINI_MODEL") or "gemini-3.5-flash-lite"

    gemini_data = None
    if api_key and api_key.strip() not in ["", "your_gemini_api_key_here", "YOUR_GEMINI_API_KEY"]:
        try:
            client = genai.Client(api_key=api_key.strip())
            query_items = [
                {
                    "index": i,
                    "course": c.get("course", ""),
                    "raw_location": c.get("building") or c.get("location") or ""
                }
                for i, c in enumerate(classes)
            ]

            prompt = f"""You are an expert Rutgers University navigation assistant.
For each of the following courses and raw locations, determine:
1. Is it a physical in-person classroom location at Rutgers University, or is it online/remote/virtual/asynchronous/unspecified?
2. If it is a physical location:
   - Provide the optimal Google Maps search location query (e.g. "Hill Center, Rutgers University, Busch Campus, Piscataway, NJ", "Tillett Hall, Rutgers University, Livingston Campus, Piscataway, NJ", "Academic Building, Rutgers University, College Ave, New Brunswick, NJ") that directly navigates to the building on Google Maps. Strip room numbers like 114 or 254 from the query so Google Maps pins the building accurately.
   - For SEC / SERC / Science and Engineering Building, always format as "Science and Engineering Resource Center, Rutgers University, Busch Campus, Piscataway, NJ".
   - Provide the Rutgers campus name (one of: "Busch", "College Ave", "Livingston", "Cook/Douglass").
3. If it is NOT a physical location (online, virtual, canvas, zoom, asynchronous, remote, or blank/unspecified):
   - "location" MUST be strictly "(Online)"
   - "campus" MUST be strictly "(Online)"
   - "is_online" MUST be true

Input items:
{json.dumps(query_items)}

Return ONLY a strictly valid JSON array of objects with the exact schema:
[
  {{
    "index": 0,
    "location": "Google Maps search string OR (Online)",
    "campus": "Busch / College Ave / Livingston / Cook/Douglass / (Online)",
    "is_online": boolean
  }}
]
"""
            response = client.models.generate_content(
                model=model_name,
                contents=prompt
            )
            text = (response.text or "").strip()
            if "```" in text:
                text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.I)
                text = re.sub(r"\s*```$", "", text)
            parsed_json = json.loads(text)
            if isinstance(parsed_json, list) and len(parsed_json) == len(classes):
                gemini_data = {item.get("index", idx): item for idx, item in enumerate(parsed_json)}
        except Exception as e:
            print(f"[GeminiLocationResolver] Gemini 3.5 Flash Lite error: {e}")

    # Apply Gemini results or intelligent fallback
    for idx, item in enumerate(classes):
        if item.get("zoom_link"):
            item["location"] = "(Online)"
            item["campus"] = "(Online)"
            item["is_online"] = True
            item["has_real_location"] = False
            item["coords"] = None
            item["stop"] = None
            continue

        raw_bldg = (item.get("building") or item.get("location") or "").strip()
        is_known_online = any(term in raw_bldg.lower() for term in ["online", "virtual", "canvas", "zoom", "asynchronous", "remote", "website", "webex"]) or not bool(raw_bldg)

        if gemini_data and idx in gemini_data:
            g_item = gemini_data[idx]
            g_loc = (g_item.get("location") or "").strip()
            g_campus = (g_item.get("campus") or "").strip()
            g_is_online = g_item.get("is_online", False) or g_loc == "(Online)"

            if g_is_online or g_loc == "(Online)":
                item["location"] = "(Online)"
                item["campus"] = "(Online)"
                item["is_online"] = True
                item["has_real_location"] = False
                item["coords"] = None
                item["stop"] = None
            else:
                item["location"] = g_loc
                item["campus"] = g_campus or "College Ave"
                item["is_online"] = False
                item["has_real_location"] = True
                matched = find_building(raw_bldg) or find_building(g_loc)
                if matched:
                    item["coords"] = matched.get("coords")
                    item["stop"] = matched.get("stop")
                    if not item["campus"] or item["campus"] == "(Online)":
                        item["campus"] = matched.get("campus")
                else:
                    item["coords"] = None
                    item["stop"] = None
        else:
            # Fallback when Gemini is unavailable
            if is_known_online:
                item["location"] = "(Online)"
                item["campus"] = "(Online)"
                item["is_online"] = True
                item["has_real_location"] = False
                item["coords"] = None
                item["stop"] = None
            else:
                matched = find_building(raw_bldg)
                if matched:
                    clean_bldg = re.sub(r"\s+\b(?:room|rm|\d{1,4}[a-z]?)\b.*$", "", raw_bldg, flags=re.I).strip() or raw_bldg
                    campus = matched.get("campus", "College Ave")
                    item["location"] = f"{clean_bldg}, Rutgers University, {campus} Campus, NJ"
                    item["campus"] = campus
                    item["coords"] = matched.get("coords")
                    item["stop"] = matched.get("stop")
                    item["is_online"] = False
                    item["has_real_location"] = True
                else:
                    item["location"] = f"{raw_bldg}, Rutgers University, New Brunswick, NJ"
                    item["campus"] = "College Ave"
                    item["coords"] = None
                    item["stop"] = None
                    item["is_online"] = False
                    item["has_real_location"] = True

        # Standardize Science and Engineering Resource Center naming
        if item.get("location"):
            item["location"] = re.sub(r"Science and Engineering Building\b", "Science and Engineering Resource Center", item["location"], flags=re.I)
        if item.get("building"):
            item["building"] = re.sub(r"Science and Engineering Building\b", "Science and Engineering Resource Center", item["building"], flags=re.I)

    return classes


def parse_ics_schedule(ics_content: str) -> Dict[str, Any]:
    """
    Parses an .ics (iCalendar) file and extracts weekly class meetings.
    - Strictly enforces official Rutgers Fall 2026 semester cutoff dates (Sept 1 - Dec 23, 2026).
    - Accurately captures recurring semester classes (RRULE with BYDAY).
    - Accurately captures individual recurring lecture meetings across the semester.
    - Excludes non-class personal events (birthdays, holidays, all-day events).
    - Consolidates identical meetings (same course, time, location) with merged day codes.
    - Returns classes ordered strictly by Date (day of week) and Time.
    """
    lines = unfold_ics(ics_content)

    raw_events = []
    in_vevent = False
    current_props: Dict[str, str] = {}

    for line in lines:
        if line == "BEGIN:VEVENT":
            in_vevent = True
            current_props = {}
        elif line == "END:VEVENT":
            in_vevent = False
            if current_props:
                raw_events.append(current_props)
        elif in_vevent and ":" in line:
            parts = line.split(":", 1)
            prop_key = parts[0].split(";")[0].upper().strip()
            prop_val = line
            current_props[prop_key] = prop_val

    # Determine active Rutgers semester cutoff bounds
    now_date = datetime.now().date()
    valid_dates = []
    for ev in raw_events:
        dtstart_line = ev.get("DTSTART", "")
        if not is_all_day(dtstart_line):
            dt = parse_ics_datetime(dtstart_line)
            if dt:
                valid_dates.append(dt.date())

    has_recent = any(abs((d - now_date).days) <= 100 for d in valid_dates) if valid_dates else False
    anchor_date = now_date if has_recent else (max(valid_dates) if valid_dates else now_date)
    term_start, term_end, term_name = get_rutgers_semester_bounds(anchor_date)

    # Active date window: strictly limit single events to current week and next week
    # (Excludes distant future events like December exams when in October)
    curr_week_start = anchor_date - timedelta(days=anchor_date.weekday() + 1)
    next_week_end = curr_week_start + timedelta(days=21)

    parsed_meetings = []

    for ev in raw_events:
        summary_line = ev.get("SUMMARY", "")
        summary = summary_line.split(":", 1)[-1].strip() if ":" in summary_line else "Class Meeting"
        
        # 1. Filter out birthdays, holidays, personal reminders, exams, tests, and quizzes
        summary_lower = summary.lower()
        if any(ign in summary_lower for ign in IGNORE_KEYWORDS) or re.search(r"\b(exam|final exam|midterm|quiz|reading day)\b", summary_lower):
            continue

        # Extract Zoom / video conference URL if present
        zoom_link = extract_zoom_link(ev)

        # 2. Filter out all-day events (e.g. VALUE=DATE or no time component)
        dtstart_line = ev.get("DTSTART", "")
        if is_all_day(dtstart_line):
            continue

        dtstart = parse_ics_datetime(dtstart_line)
        if not dtstart:
            continue

        dtend_line = ev.get("DTEND", "")
        dtend = parse_ics_datetime(dtend_line)

        # 3. Verify meeting duration (academic classes are typically 25 mins to 5 hours)
        if dtend:
            duration_minutes = (dtend - dtstart).total_seconds() / 60
            if duration_minutes < 10 or duration_minutes > 480:
                continue
            end_time = f"{dtend.hour:02d}:{dtend.minute:02d}"
        else:
            # Default Rutgers class period ~80 mins
            end_dt = dtstart + timedelta(minutes=80)
            end_time = f"{end_dt.hour:02d}:{end_dt.minute:02d}"

        start_time = f"{dtstart.hour:02d}:{dtstart.minute:02d}"

        location_line = ev.get("LOCATION", "")
        location = location_line.split(":", 1)[-1].strip() if ":" in location_line else ""
        location = location.replace("\\,", ",").replace("\\;", ";").strip()

        # Clean common prefixes (e.g. "Lecture:", "Class:")
        cleaned_summary = re.sub(r"^(Lecture|Recitation|Lab|Class):\s*", "", summary, flags=re.I).strip()

        rrule_line = ev.get("RRULE", "")
        rrule = rrule_line.split(":", 1)[-1].strip() if ":" in rrule_line else ""

        # 4. Strict Rutgers Fall semester cutoff:
        # Strictly exclude all events from August or earlier (Summer session / prior terms)
        # Official Rutgers Fall 2026: September 1, 2026 to December 23, 2026
        earliest_start = term_start - timedelta(days=1)
        if dtstart.date() < earliest_start or dtstart.date() > term_end:
            continue

        event_days = []

        if rrule:
            rrule_upper = rrule.upper()
            
            # Reject non-weekly recurring events (like annual birthdays, monthly bills)
            if "FREQ=YEARLY" in rrule_upper or "FREQ=MONTHLY" in rrule_upper:
                continue

            # Recurring sequence cannot start beyond next week
            if dtstart.date() > next_week_end:
                continue

            # If recurring sequence ended before the active window started, discard
            until_match = re.search(r"UNTIL=(\d{8}(?:T\d{6}Z?)?)", rrule_upper)
            if until_match:
                until_str = until_match.group(1)
                m = re.match(r"^(\d{4})(\d{2})(\d{2})", until_str)
                if m:
                    until_date = date(int(m.group(1)), int(m.group(2)), int(m.group(3)))
                    if until_date < curr_week_start:
                        continue

            # Extract BYDAY recurrence days (e.g. BYDAY=MO,WE,FR or BYDAY=TU,TH)
            byday_match = re.search(r"BYDAY=([A-Z0-9,]+)", rrule)
            if byday_match:
                bydays = byday_match.group(1).split(",")
                for bd in bydays:
                    code = bd[-2:] # Handles 1MO, 2TU, etc.
                    if code in ICS_DAY_MAP:
                        event_days.append(ICS_DAY_MAP[code])
            else:
                event_days.append(WEEKDAY_TO_DAY[dtstart.weekday()])

        else:
            # Single or non-RRULE exported class event:
            # STRICTLY exclude events beyond current week and next week!
            # (Excludes December exams, future reviews, and past one-off meetings)
            if dtstart.date() < curr_week_start or dtstart.date() > next_week_end:
                continue

            event_day_code = WEEKDAY_TO_DAY[dtstart.weekday()]
            event_days.append(event_day_code)

        if event_days:
            parsed_meetings.append({
                "course": cleaned_summary,
                "days": event_days,
                "startTime": start_time,
                "endTime": end_time,
                "building": location,
                "location": location,
                "zoom_link": zoom_link
            })

    # Group identical (course, building, time) across days into recurring weekly entries
    grouped_dict = {}
    for item in parsed_meetings:
        course = item.get("course", "").strip()
        building = item.get("building", "").strip()
        start = normalize_time(item.get("startTime", ""))
        end = normalize_time(item.get("endTime", ""))
        days = normalize_days(item.get("days", []))

        norm_course = re.sub(r":\d{2,3}$", "", course.lower()).strip()
        norm_bldg = building.lower()
        key = (norm_course, norm_bldg, start, end)

        if key not in grouped_dict:
            grouped_dict[key] = {
                "course": course,
                "building": building,
                "startTime": start,
                "endTime": end,
                "days": days,
                "zoom_link": item.get("zoom_link")
            }
        else:
            if not grouped_dict[key].get("zoom_link") and item.get("zoom_link"):
                grouped_dict[key]["zoom_link"] = item.get("zoom_link")
            for d in days:
                if d not in grouped_dict[key]["days"]:
                    grouped_dict[key]["days"].append(d)
            grouped_dict[key]["days"] = sorted(
                grouped_dict[key]["days"],
                key=lambda x: DAY_ORDER.get(x, 99)
            )

    consolidated = list(grouped_dict.values())

    # Enrich with days_display
    for item in consolidated:
        item["days_display"] = ", ".join(item["days"])

    # Resolve class locations using Gemini 3.5 Flash Lite:
    # Physical locations become the Google Maps search location query;
    # Non-physical/virtual classes strictly become "(Online)".
    consolidated = resolve_locations_with_gemini(consolidated)

    # Order strictly by Date (earliest day of the week) and Time
    def class_sort_key(cls_item):
        min_day = min((DAY_ORDER.get(d, 99) for d in cls_item.get("days", [])), default=99)
        return (min_day, cls_item.get("startTime", "00:00"))

    consolidated.sort(key=class_sort_key)

    if not consolidated:
        return {
            "status": "success",
            "message": "No course meetings could be identified in the uploaded calendar file.",
            "classes": []
        }

    return {"status": "success", "classes": consolidated}
