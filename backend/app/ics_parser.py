import os
import re
from datetime import datetime, timedelta, date
from typing import List, Dict, Any, Optional

from app.rutgers_data import CAMPUS_BUILDINGS
from app.schedule_parser import DAY_ORDER, normalize_time, normalize_days

ICS_DAY_MAP = {
    "MO": "M",
    "TU": "T",
    "WE": "W",
    "TH": "TH",
    "FR": "F",
    "SA": "S",
    "SU": "SU"
}

WEEKDAY_TO_DAY = ["M", "T", "W", "TH", "F", "S", "SU"]

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
    """Parses various iCalendar DTSTART / DTEND formats."""
    if not val:
        return None
    # Strip parameters if any (e.g. TZID=America/New_York:20261012T102000)
    if ":" in val:
        val = val.split(":")[-1].strip()
    val = val.rstrip("Z")
    
    # Format YYYYMMDDTHHMMSS
    match = re.match(r"^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?$", val)
    if match:
        y, m, d, hh, mm = int(match.group(1)), int(match.group(2)), int(match.group(3)), int(match.group(4)), int(match.group(5))
        ss = int(match.group(6)) if match.group(6) else 0
        return datetime(y, m, d, hh, mm, ss)
    
    # Format YYYYMMDD (all day)
    match_date = re.match(r"^(\d{4})(\d{2})(\d{2})$", val)
    if match_date:
        y, m, d = int(match_date.group(1)), int(match_date.group(2)), int(match_date.group(3))
        return datetime(y, m, d, 9, 0, 0)
    
    return None

def parse_ics_schedule(ics_content: str) -> Dict[str, Any]:
    """
    Parses an .ics (iCalendar) file and extracts class meetings for the current week.
    Consolidates identical meetings (same course, time, and location) with merged day codes.
    Returns sorted by Date (day of week) and Time.
    """
    lines = unfold_ics(ics_content)
    now = datetime.now()
    # Monday to Sunday of the current week
    current_monday = (now - timedelta(days=now.weekday())).date()
    current_sunday = current_monday + timedelta(days=6)

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
            prop_val = line # preserve full line for parameter parsing
            current_props[prop_key] = prop_val

    parsed_meetings = []
    fallback_meetings = []

    for ev in raw_events:
        summary_line = ev.get("SUMMARY", "")
        summary = summary_line.split(":", 1)[-1].strip() if ":" in summary_line else "Class Meeting"
        
        # Clean common prefixes (e.g. "Lecture:", "Class:")
        summary = re.sub(r"^(Lecture|Recitation|Lab|Class):\s*", "", summary, flags=re.I).strip()

        location_line = ev.get("LOCATION", "")
        location = location_line.split(":", 1)[-1].strip() if ":" in location_line else ""
        location = location.replace("\\,", ",").replace("\\;", ";").strip()

        dtstart = parse_ics_datetime(ev.get("DTSTART", ""))
        dtend = parse_ics_datetime(ev.get("DTEND", ""))

        if not dtstart:
            continue

        start_time = f"{dtstart.hour:02d}:{dtstart.minute:02d}"
        if dtend:
            end_time = f"{dtend.hour:02d}:{dtend.minute:02d}"
        else:
            # Default Rutgers period ~80 mins
            end_dt = dtstart + timedelta(minutes=80)
            end_time = f"{end_dt.hour:02d}:{end_dt.minute:02d}"

        rrule_line = ev.get("RRULE", "")
        rrule = rrule_line.split(":", 1)[-1].strip() if ":" in rrule_line else ""

        event_days = []
        is_in_current_week = False

        if rrule:
            # Extract BYDAY if present
            byday_match = re.search(r"BYDAY=([A-Z,]+)", rrule)
            if byday_match:
                bydays = byday_match.group(1).split(",")
                for bd in bydays:
                    code = bd[-2:] # In case of 1MO or 2TU
                    if code in ICS_DAY_MAP:
                        event_days.append(ICS_DAY_MAP[code])
            else:
                event_days.append(WEEKDAY_TO_DAY[dtstart.weekday()])

            # Check UNTIL
            until_match = re.search(r"UNTIL=(\d{8}(?:T\d{6}Z?)?)", rrule)
            if until_match:
                until_dt = parse_ics_datetime(until_match.group(1))
                if until_dt and until_dt.date() < current_monday:
                    # Event sequence expired before this week
                    continue

            # Check if recurrence started on or before end of current week
            if dtstart.date() <= current_sunday:
                is_in_current_week = True
        else:
            # Single non-repeating event
            event_date = dtstart.date()
            event_day_code = WEEKDAY_TO_DAY[dtstart.weekday()]
            event_days.append(event_day_code)
            if current_monday <= event_date <= current_sunday:
                is_in_current_week = True

        meeting_record = {
            "course": summary,
            "days": event_days if event_days else [WEEKDAY_TO_DAY[dtstart.weekday()]],
            "startTime": start_time,
            "endTime": end_time,
            "building": location,
            "location": location
        }

        if is_in_current_week:
            parsed_meetings.append(meeting_record)
        else:
            # Keep as fallback in case whole calendar has dates from a different semester week
            fallback_meetings.append(meeting_record)

    # If no meetings strictly fell in the current calendar week date range,
    # use the schedule's weekly template
    final_raw_meetings = parsed_meetings if parsed_meetings else fallback_meetings

    # Post-processing: Group identical (course, building, time) across days
    grouped_dict = {}
    for item in final_raw_meetings:
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
                "days": days
            }
        else:
            for d in days:
                if d not in grouped_dict[key]["days"]:
                    grouped_dict[key]["days"].append(d)
            grouped_dict[key]["days"] = sorted(
                grouped_dict[key]["days"],
                key=lambda x: DAY_ORDER.get(x, 99)
            )

    consolidated = list(grouped_dict.values())

    # Enrich with campus and formatted location
    for item in consolidated:
        item["days_display"] = ", ".join(item["days"])
        b_clean = item.get("building", "").lower()
        matched_building = None

        for key, data in CAMPUS_BUILDINGS.items():
            if key in b_clean or (data.get("code") and data["code"].lower() in b_clean.split()):
                matched_building = data
                break

        if matched_building:
            item["campus"] = matched_building["campus"]
        else:
            item["campus"] = "College Ave"

        bldg = item.get("building", "")
        campus = item.get("campus", "")
        if bldg:
            if campus and campus.lower() not in bldg.lower():
                item["location"] = f"{bldg} ({campus})"
            else:
                item["location"] = bldg
        else:
            item["location"] = f"Campus Classroom ({campus})"

    # Order strictly by Date (earliest day of the week) and Time
    def class_sort_key(cls_item):
        min_day = min((DAY_ORDER.get(d, 99) for d in cls_item.get("days", [])), default=99)
        return (min_day, cls_item.get("startTime", "00:00"))

    consolidated.sort(key=class_sort_key)

    return {"status": "success", "classes": consolidated}
