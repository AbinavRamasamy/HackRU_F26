#calander scanner
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

IGNORE_KEYWORDS = [
    "birthday", "bday", "b-day", "anniversary", "holiday", 
    "observed", "day off", "vacation", "no classes", "reminder", 
    "task", "doctor", "dentist", "payday", "flight", "check-in",
    "garbage", "trash", "recycle", "election"
]

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

def get_current_semester_bounds(ref_date: date):
    """
    Returns (semester_start, semester_end, semester_name) based on official Rutgers semester dates.
    - Fall Semester: Sept 1 to Dec 23
    - Spring Semester: Jan 15 to May 15
    - Summer Session: May 25 to Aug 20
    """
    year = ref_date.year
    month = ref_date.month

    if month >= 9:
        # Fall Semester (starts Sept 1, ends Dec 23)
        return date(year, 9, 1), date(year, 12, 23), "Fall"
    elif month <= 5 and (month > 1 or ref_date.day >= 15):
        # Spring Semester (starts mid-Jan, ends mid-May)
        return date(year, 1, 15), date(year, 5, 15), "Spring"
    elif 5 < month < 9:
        # Summer Session (starts late May, ends mid-Aug)
        return date(year, 5, 25), date(year, 8, 20), "Summer"
    else:
        # Winter Session (early Jan)
        return date(year, 1, 2), date(year, 1, 14), "Winter"

def parse_ics_schedule(ics_content: str) -> Dict[str, Any]:
    """
    Parses an .ics (iCalendar) file and extracts active class meetings for the CURRENT week only.
    - Excludes non-class personal events (birthdays, holidays, all-day events).
    - Enforces strict Rutgers semester cutoff dates (e.g. ignores August summer/orientation events).
    - Consolidates identical meetings (same course, time, location) with merged day codes.
    - Returns classes ordered strictly by Date (day of week) and Time.
    """
    lines = unfold_ics(ics_content)
    now = datetime.now()
    # Monday to Sunday of the current week
    current_monday = (now - timedelta(days=now.weekday())).date()
    current_sunday = current_monday + timedelta(days=6)
    
    # Strict semester cutoff dates for Rutgers
    semester_start, semester_end, semester_name = get_current_semester_bounds(current_monday)

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

    parsed_meetings = []

    for ev in raw_events:
        summary_line = ev.get("SUMMARY", "")
        summary = summary_line.split(":", 1)[-1].strip() if ":" in summary_line else "Class Meeting"
        
        # 1. Filter out birthdays, holidays, and personal reminders
        summary_lower = summary.lower()
        if any(ign in summary_lower for ign in IGNORE_KEYWORDS):
            continue

        # 2. Filter out all-day events (e.g. VALUE=DATE or no time component)
        dtstart_line = ev.get("DTSTART", "")
        if is_all_day(dtstart_line):
            continue

        dtstart = parse_ics_datetime(dtstart_line)
        if not dtstart:
            continue

        # 3. Enforce semester cutoffs: Skip any event that started before official semester start (e.g. in August)
        if dtstart.date() < semester_start:
            continue
        if dtstart.date() > semester_end:
            continue

        dtend_line = ev.get("DTEND", "")
        dtend = parse_ics_datetime(dtend_line)

        # 4. Verify meeting duration (academic classes are between 25 mins and 5 hours)
        if dtend:
            duration_minutes = (dtend - dtstart).total_seconds() / 60
            if duration_minutes < 25 or duration_minutes > 300:
                continue
            end_time = f"{dtend.hour:02d}:{dtend.minute:02d}"
        else:
            # Default Rutgers period ~80 mins
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

        event_days = []
        is_active_current_week = False

        if rrule:
            rrule_upper = rrule.upper()
            
            # Reject non-weekly recurring events (like annual birthdays, monthly bills)
            if "FREQ=YEARLY" in rrule_upper or "FREQ=MONTHLY" in rrule_upper:
                continue

            # Check UNTIL: if sequence ended before this week, discard
            until_match = re.search(r"UNTIL=(\d{8}(?:T\d{6}Z?)?)", rrule_upper)
            if until_match:
                until_str = until_match.group(1)
                match_until_date = re.match(r"^(\d{4})(\d{2})(\d{2})", until_str)
                if match_until_date:
                    uy, um, ud = int(match_until_date.group(1)), int(match_until_date.group(2)), int(match_until_date.group(3))
                    until_date = date(uy, um, ud)
                    if until_date < current_monday:
                        # Recurrence ended before the current week
                        continue

            # Check COUNT: if limited occurrences, check that it didn't end before this week
            count_match = re.search(r"COUNT=(\d+)", rrule_upper)
            if count_match:
                count_val = int(count_match.group(1))
                last_occurrence = dtstart.date() + timedelta(weeks=count_val)
                if last_occurrence < current_monday:
                    continue

            # Ensure event has already started by end of current week
            if dtstart.date() > current_sunday:
                continue

            # Extract BYDAY recurrence days
            byday_match = re.search(r"BYDAY=([A-Z,]+)", rrule)
            if byday_match:
                bydays = byday_match.group(1).split(",")
                for bd in bydays:
                    code = bd[-2:] # Handles 1MO, 2TU, etc.
                    if code in ICS_DAY_MAP:
                        event_days.append(ICS_DAY_MAP[code])
            else:
                event_days.append(WEEKDAY_TO_DAY[dtstart.weekday()])

            is_active_current_week = True

        else:
            # Single non-repeating event: MUST take place strictly within the current week
            event_date = dtstart.date()
            if current_monday <= event_date <= current_sunday:
                event_day_code = WEEKDAY_TO_DAY[dtstart.weekday()]
                event_days.append(event_day_code)
                is_active_current_week = True

        if is_active_current_week and event_days:
            parsed_meetings.append({
                "course": cleaned_summary,
                "days": event_days,
                "startTime": start_time,
                "endTime": end_time,
                "building": location,
                "location": location
            })

    # Group identical (course, building, time) across days for current week
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

    # Enrich with Rutgers campus and location formatting
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

    if not consolidated:
        return {
            "status": "success",
            "message": "No active classes found for the current week in the uploaded calendar file.",
            "classes": []
        }

    return {"status": "success", "classes": consolidated}
