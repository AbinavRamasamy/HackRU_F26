import { CapacitorCalendar } from '@ebarooni/capacitor-calendar';
import { Capacitor } from '@capacitor/core';
import { resolveLocationCoords } from './transitDirectory';

export interface ClassItem {
  course: string;
  days: string[] | string;
  days_display?: string;
  startTime: string;
  endTime: string;
  building: string;
  location?: string;
  campus: string;
  zoom_link?: string;
}

const DAY_ORDER: Record<string, number> = {
  "M": 1, "T": 2, "W": 3, "TH": 4, "F": 5, "S": 6, "SU": 7
};

export const sortClassesByDateAndTime = (items: ClassItem[]): ClassItem[] => {
  return [...items].sort((a, b) => {
    const aDays = Array.isArray(a.days) ? a.days : [a.days];
    const bDays = Array.isArray(b.days) ? b.days : [b.days];
    const aMinDay = Math.min(...aDays.map(d => DAY_ORDER[d] || 99));
    const bMinDay = Math.min(...bDays.map(d => DAY_ORDER[d] || 99));

    if (aMinDay !== bMinDay) {
      return aMinDay - bMinDay;
    }
    return (a.startTime || "00:00").localeCompare(b.startTime || "00:00");
  });
};

export interface UpcomingClassResult {
  nextClass: ClassItem | null;
  isToday: boolean;
  minutesUntil: number | null;
  dayLabel: string;
}

/**
 * Finds the next upcoming class relative to the current time and day of week
 */
export function getNextUpcomingClass(classes: ClassItem[]): UpcomingClassResult {
  if (!classes || classes.length === 0) {
    return { nextClass: null, isToday: false, minutesUntil: null, dayLabel: '' };
  }

  const now = new Date();
  const currentMins = now.getHours() * 60 + now.getMinutes();
  const daysArr = ["SU", "M", "T", "W", "TH", "F", "S"];
  const currentDayCode = daysArr[now.getDay()];

  const parseTimeToMins = (timeStr: string): number => {
    if (!timeStr) return 0;
    const parts = timeStr.split(":");
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1] || "0", 10);
  };

  // 1. Check for classes today that haven't ended or are coming up next
  const todayClasses = classes.filter(cls => {
    const days = Array.isArray(cls.days) ? cls.days : [cls.days];
    return days.includes(currentDayCode);
  });
  todayClasses.sort((a, b) => parseTimeToMins(a.startTime) - parseTimeToMins(b.startTime));

  const upcomingToday = todayClasses.find(cls => parseTimeToMins(cls.startTime) >= currentMins);

  if (upcomingToday) {
    const classStartMins = parseTimeToMins(upcomingToday.startTime);
    const diff = classStartMins - currentMins;
    return {
      nextClass: upcomingToday,
      isToday: true,
      minutesUntil: diff >= 0 ? diff : null,
      dayLabel: 'Today'
    };
  }

  // 2. If no more classes today, look for the next day with classes
  const dayIndex = now.getDay();
  for (let offset = 1; offset <= 7; offset++) {
    const nextDayIdx = (dayIndex + offset) % 7;
    const targetDayCode = daysArr[nextDayIdx];
    const dayClasses = classes.filter(cls => {
      const days = Array.isArray(cls.days) ? cls.days : [cls.days];
      return days.includes(targetDayCode);
    });

    if (dayClasses.length > 0) {
      dayClasses.sort((a, b) => parseTimeToMins(a.startTime) - parseTimeToMins(b.startTime));
      const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      return {
        nextClass: dayClasses[0],
        isToday: false,
        minutesUntil: null,
        dayLabel: offset === 1 ? 'Tomorrow' : dayNames[nextDayIdx]
      };
    }
  }

  return {
    nextClass: classes[0],
    isToday: false,
    minutesUntil: null,
    dayLabel: 'Upcoming'
  };
}

/**
 * Format 24-hr time to friendly 12-hr display (e.g. 11:40 -> 11:40 AM)
 */
export function formatFriendlyTime(timeStr?: string): string {
  if (!timeStr) return '';
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;
  const h = parseInt(parts[0], 10);
  const m = parts[1];
  const ampm = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 === 0 ? 12 : h % 12;
  return `${displayH}:${m} ${ampm}`;
}

/**
 * Request permission and sync events from the mobile device's default calendar
 */
export async function syncDefaultDeviceCalendar(): Promise<{
  success: boolean;
  classes?: ClassItem[];
  error?: string;
  source: 'native' | 'web';
}> {
  // If running in Capacitor native container (iOS / Android)
  if (Capacitor.isNativePlatform()) {
    try {
      // 1. Request full calendar access
      await CapacitorCalendar.requestFullCalendarAccess();

      // 2. Query events in a window: 14 days ago to 90 days in the future
      const now = new Date();
      const fromDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      const toDate = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

      const response = await CapacitorCalendar.listEventsInRange({
        from: fromDate.getTime(),
        to: toDate.getTime()
      });

      const events = response.result || [];
      if (events.length === 0) {
        return {
          success: true,
          classes: [],
          source: 'native'
        };
      }

      const daysArr = ["SU", "M", "T", "W", "TH", "F", "S"];
      const formatTime = (ts: number): string => {
        const d = new Date(ts);
        const h = String(d.getHours()).padStart(2, '0');
        const m = String(d.getMinutes()).padStart(2, '0');
        return `${h}:${m}`;
      };

      // Map & group events into recurring classes
      const rawClasses: Map<string, ClassItem> = new Map();

      for (const ev of events) {
        if (ev.isAllDay) continue; // Skip all-day events like holidays
        const title = (ev.title || '').trim();
        if (!title) continue;

        const start = new Date(ev.startDate);
        const end = new Date(ev.endDate);
        const durationMins = (end.getTime() - start.getTime()) / (1000 * 60);

        // Filter out very short or excessively long events (allow 10m to 8h)
        if (durationMins < 10 || durationMins > 480) continue;

        // Strictly filter out exams, finals, midterms, quizzes, holidays, and reminders
        const titleLower = title.toLowerCase();
        const isExamOrExcluded =
          /\b(exam|final exam|finals|midterm|quiz|test|reading day)\b/i.test(titleLower) ||
          [
            'final exam', 'finals', 'midterm', 'quiz', 'reading day',
            'holiday', 'recess', 'break', 'canceled', 'cancelled', 'labor day', 'thanksgiving', 'birthday'
          ].some(ign => titleLower.includes(ign));

        if (isExamOrExcluded) continue;

        const dayCode = daysArr[start.getDay()];
        const startTimeStr = formatTime(ev.startDate);
        const endTimeStr = formatTime(ev.endDate);

        // Check for Zoom or video conference link across fields
        const allText = [
          (ev as any).url || '',
          ev.location || '',
          (ev as any).description || '',
          (ev as any).notes || ''
        ].join(' ');

        const zoomMatch = allText.match(/https?:\/\/[a-zA-Z0-9.\-_]*(?:zoom\.us|webex\.com|teams\.microsoft\.com|meet\.google\.com)\/[^\s"'<>,;)]+/i);
        const zoomLink = zoomMatch ? zoomMatch[0] : undefined;

        // Resolve location to Rutgers buildings/campuses
        const locString = (ev.location || '').trim();
        const hasRealLocation = locString && !locString.toLowerCase().includes('zoom') && !locString.toLowerCase().includes('online');

        let finalLoc = locString || '(Online)';
        let finalCampus = 'College Ave';
        let bldgName = locString;

        if (zoomLink || !hasRealLocation) {
          finalLoc = '(Online)';
          finalCampus = '(Online)';
          bldgName = '(Online)';
        } else {
          const resolved = resolveLocationCoords(locString || title, 'College Ave');
          const roomMatch = locString.match(/(?:room|rm|#)?\s*([A-Za-z0-9\-]+)/i);
          bldgName = resolved.name;
          finalLoc = roomMatch ? locString : resolved.name;
          finalCampus = resolved.campus;
        }

        // Group key by title + start time + building
        const groupKey = `${title.toLowerCase()}_${startTimeStr}_${bldgName.toLowerCase()}`;

        if (rawClasses.has(groupKey)) {
          const existing = rawClasses.get(groupKey)!;
          const currentDays = Array.isArray(existing.days) ? existing.days : [existing.days];
          if (!currentDays.includes(dayCode)) {
            existing.days = [...currentDays, dayCode];
          }
          if (!existing.zoom_link && zoomLink) {
            existing.zoom_link = zoomLink;
          }
        } else {
          rawClasses.set(groupKey, {
            course: title,
            days: [dayCode],
            startTime: startTimeStr,
            endTime: endTimeStr,
            building: bldgName,
            location: finalLoc,
            campus: finalCampus,
            zoom_link: zoomLink
          });
        }
      }

      const parsedList = sortClassesByDateAndTime(Array.from(rawClasses.values()));
      return {
        success: true,
        classes: parsedList,
        source: 'native'
      };
    } catch (err: any) {
      console.warn("Failed to sync native calendar:", err);
      return {
        success: false,
        error: err?.message || 'Calendar permission was not granted or failed to access native calendar.',
        source: 'native'
      };
    }
  }

  // On Web / Laptop browser fallback
  return {
    success: false,
    error: 'Device calendar sync is available in the native mobile app. On computer/laptop, upload your .ics schedule file or WebReg screenshot.',
    source: 'web'
  };
}
