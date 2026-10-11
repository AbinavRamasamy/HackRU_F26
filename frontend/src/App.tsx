import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Upload, Calendar, ArrowRight, MapPin, Code, Navigation, LocateFixed, ArrowDownUp, Sparkles, X, ChevronDown, Trash2, RefreshCw, User } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { TransitWidget } from './TransitWidget';
import { TransitMap } from './TransitMap';
import { AICopilotChat } from './AICopilotChat';
import { ProfileMenu } from './ProfileMenu';
import { requestBrowserLocation, type ResolvedLocation } from './geolocation';
import {
  RUTGERS_BUILDINGS,
  RUTGERS_BUS_STOPS,
  matchCampus,
  findNearestBusStop,
  resolveLocationCoords,
  getStopsForRoute,
  getStopShortCode,
  getRouteColorInfo
} from './transitDirectory';
import {
  type ClassItem,
  getNextUpcomingClass,
  syncDefaultDeviceCalendar,
  sortClassesByDateAndTime
} from './calendarSync';
import { API_BASE_URL } from './apiConfig';

const WingedSneakerIcon = ({ size = 21, color = "#fff" }: { size?: number; color?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    stroke={color}
    strokeWidth="6.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{
      filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.25))',
      display: 'block'
    }}
  >
    {/* 1. Hermes Wing with 3 Rounded Feathers Sweeping Up and Left */}
    <path
      d="M 52 42 C 45 28 32 18 16 12 C 14 11 13 13 14 15 C 16 20 20 25 21 28 C 17 25 15 25 15 27 C 16 32 23 37 25 39 C 21 37 19 38 20 41 C 22 47 28 50 32 50 C 37 50 44 47 50 42"
      strokeWidth="6.8"
    />
    {/* Interior Wing Feather Lines */}
    <path d="M 21 28 C 28 31 36 34 43 33" strokeWidth="5.8" />
    <path d="M 25 39 C 32 41 38 43 44 41" strokeWidth="5.8" />

    {/* 2. Shoe Heel & Upper */}
    <path d="M 32 50 C 26 55 23 62 21 68" strokeWidth="6.8" />
    <path d="M 50 42 C 55 48 64 60 74 67 C 80 71 85 73 87 71 C 88 68 85 64 78 60 C 68 53 58 45 50 42" strokeWidth="6.8" />

    {/* 3. Double-Layer Curved Sole */}
    <path d="M 21 68 C 36 74 58 78 84 72" strokeWidth="6.8" />
    <path d="M 22 74 C 38 82 60 85 86 78 C 88 77 88 74 85 72" strokeWidth="6.8" />

    {/* 4. Two Diagonal Stripes Across Midfoot */}
    <line x1="42" y1="67" x2="60" y2="52" strokeWidth="5.8" />
    <line x1="53" y1="73" x2="70" y2="58" strokeWidth="5.8" />
  </svg>
);

export function App() {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('scarlethop_theme');
    return saved === 'light' ? 'light' : 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('scarlethop_theme', theme);
  }, [theme]);

  const [isSessionUploaded, setIsSessionUploaded] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<any>(() => {
    try {
      const savedUser = localStorage.getItem('scarlethop_auth_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const [classes, setClasses] = useState<ClassItem[]>(() => {
    try {
      const savedUser = localStorage.getItem('scarlethop_auth_user');
      // On desktop, only restore persisted classes if authenticated
      if (!Capacitor.isNativePlatform() && !savedUser) {
        return [];
      }
      const saved = localStorage.getItem('scarlethop_classes');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      // Only persist to localStorage if authenticated or native or user uploaded in session
      if (Capacitor.isNativePlatform() || currentUser || isSessionUploaded) {
        localStorage.setItem('scarlethop_classes', JSON.stringify(classes));
      } else {
        localStorage.removeItem('scarlethop_classes');
      }
    } catch (err) {
      console.warn("Failed to persist classes to localStorage:", err);
    }
  }, [classes, currentUser, isSessionUploaded]);

  const [isDbRefreshing, setIsDbRefreshing] = useState(false);

  // Pull latest synced classes from backend database based on user_id / username
  const fetchScheduleFromDb = useCallback(async (userToFetch = currentUser, notify = false) => {
    // If not signed in and on desktop, schedule should be empty unless user uploaded .ics this session
    if (!Capacitor.isNativePlatform() && !userToFetch?.netId) {
      if (!isSessionUploaded) {
        setClasses([]);
      }
      if (notify) {
        alert("Please sign in with your Rutgers NetID to fetch your saved schedule from the database.");
      }
      return;
    }

    setIsDbRefreshing(true);
    try {
      const username = userToFetch?.netId;
      const url = `${API_BASE_URL}/api/calendar/device-sync${username ? `?username=${username}` : ''}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data?.classes && Array.isArray(data.classes)) {
          const sorted = sortClassesByDateAndTime(data.classes);
          setClasses(sorted);
          if (notify) {
            alert(sorted.length > 0
              ? `Loaded ${sorted.length} classes from database for ${username}!`
              : `Connected to database for ${username}, but no classes are saved yet.`
            );
          }
        } else if (notify) {
          alert(`No saved schedule found in database for ${username}.`);
        }
      } else if (notify) {
        alert(`Failed to retrieve schedule from database (HTTP ${res.status}).`);
      }
    } catch (err: any) {
      console.warn("Database schedule refresh error:", err);
      if (notify) {
        alert(`Could not connect to database: ${err?.message || err}`);
      }
    } finally {
      setIsDbRefreshing(false);
    }
  }, [currentUser, isSessionUploaded]);

  // On startup or whenever currentUser changes (sign in / sign out), refresh schedule from database
  useEffect(() => {
    if (currentUser?.netId) {
      fetchScheduleFromDb(currentUser, false);
    } else if (!Capacitor.isNativePlatform() && !isSessionUploaded) {
      setClasses([]);
    }
  }, [currentUser, fetchScheduleFromDb, isSessionUploaded]);

  const [isCalendarSyncing, setIsCalendarSyncing] = useState(false);
  const scheduleFileInputRef = useRef<HTMLInputElement>(null);
  const upcomingClassInfo = useMemo(() => getNextUpcomingClass(classes), [classes]);

  const [selectedDayFilter, setSelectedDayFilter] = useState<string>("ALL");

  const [originCampus, setOriginCampus] = useState("Busch");
  const [destCampus, setDestCampus] = useState("College Ave");
  const [currentLocation, setCurrentLocation] = useState("Busch Student Center");
  const [targetLocation, setTargetLocation] = useState("College Ave Student Center");
  const [geoStatus, setGeoStatus] = useState<"idle" | "requesting" | "granted" | "denied">("idle");
  const [resolvedGeo, setResolvedGeo] = useState<ResolvedLocation | null>(null);
  const [planResult, setPlanResult] = useState<any>(null);
  const [selectedRoute, setSelectedRoute] = useState<any | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showWidgetOverlay, setShowWidgetOverlay] = useState(false);
  const [showCopilotModal, setShowCopilotModal] = useState(false);
  const [isRouteFormExpanded, setIsRouteFormExpanded] = useState(false);
  const [showAllRoutes, setShowAllRoutes] = useState(false);
  const [mobileTab, setMobileTab] = useState<'map' | 'routes'>('map');
  const widgetTriggerRef = useRef<HTMLButtonElement>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileTriggerRef = useRef<HTMLButtonElement>(null);
  const [buses, setBuses] = useState<any[]>([]);
  const [locationZoomTrigger, setLocationZoomTrigger] = useState<number>(0);
  const [weatherData, setWeatherData] = useState<any>(null);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const username = currentUser?.netId;
        const url = `${API_BASE_URL}/api/weather${username ? `?username=${username}` : ''}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setWeatherData(data);
        }
      } catch (err) {
        console.warn("Weather fetch error:", err);
      }
    };
    fetchWeather();
    const interval = setInterval(fetchWeather, 120000);
    return () => clearInterval(interval);
  }, [currentUser]);

  const requestLocationPermission = (isManual = false) => {
    setGeoStatus("requesting");
    requestBrowserLocation(
      (loc) => {
        setGeoStatus("granted");
        setResolvedGeo(loc);
        setCurrentLocation(loc.locationName);
        setOriginCampus(loc.campus);
        if (isManual) {
          setLocationZoomTrigger(Date.now());
        }
      },
      (err) => {
        console.warn("Geolocation request failed or denied:", err);
        setGeoStatus("denied");
        if (isManual) {
          setLocationZoomTrigger(Date.now());
        }
      }
    );
  };

  const handleLocationPillClick = () => {
    setMobileTab('map');
    setLocationZoomTrigger(Date.now());
    requestLocationPermission(true);
  };

  useEffect(() => {
    requestLocationPermission(false);
  }, []);

  useEffect(() => {
    const fetchBuses = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/telemetry`);
        if (res.ok) {
          const data = await res.json();
          if (data.buses && data.buses.length > 0) {
            setBuses(data.buses);
            return;
          }
        }
      } catch {
        // Fallback simulated fleet
      }
      setBuses([
        { id: "bus-101", route: "Weekend 1", destination: "Cook / Douglass", campus: "College Ave", lat: 40.5050, lon: -74.4500, speed_mph: 22, occupancy: "Seats Available", eta_mins: 6, next_stop: "Red Oak Lane" },
        { id: "bus-102", route: "Weekend 1", destination: "Cook / Douglass", campus: "Livingston", lat: 40.5220, lon: -74.4360, speed_mph: 18, occupancy: "Seats Available", eta_mins: 5, next_stop: "Red Oak Lane" },
        { id: "bus-201", route: "Weekend 1", destination: "College Ave", campus: "Busch", lat: 40.5245, lon: -74.4420, speed_mph: 26, occupancy: "Seats Available", eta_mins: 1, next_stop: "Busch Student Center" },
        { id: "bus-301", route: "Weekend 2", destination: "Livingston", campus: "College Ave", lat: 40.5100, lon: -74.4550, speed_mph: 15, occupancy: "Seats Available", eta_mins: 5, next_stop: "College Hall" },
        { id: "bus-302", route: "Weekend 2", destination: "Cook / Douglass", campus: "Busch", lat: 40.5230, lon: -74.4580, speed_mph: 19, occupancy: "Seats Available", eta_mins: 1, next_stop: "Lipman Hall" },
        { id: "bus-401", route: "Weekend 2", destination: "College Ave", campus: "Cook", lat: 40.4850, lon: -74.4380, speed_mph: 14, occupancy: "Seats Available", eta_mins: 6, next_stop: "College Avenue Student Center" }
      ]);
    };
    fetchBuses();
    const interval = setInterval(fetchBuses, 12000);
    return () => clearInterval(interval);
  }, []);

  const handleCalculateRoute = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin_campus: originCampus,
          destination_campus: destCampus,
          target_arrival_time: "12:00",
          origin_name: currentLocation,
          destination_name: targetLocation,
          username: currentUser?.netId,
          prefer_walking: currentUser?.preferences?.prefer_walking
        })
      });
      if (res.ok) {
        const data = await res.json();
        setPlanResult(data);
        const stillServes = selectedRoute && data.routes?.some((r: any) => r.name === selectedRoute.name);
        if (!stillServes && data.routes && data.routes.length > 0) {
          setSelectedRoute(data.routes[0]);
        }
        return;
      }
    } catch {
      // Fallback calculation
    }

    const isSame = originCampus === destCampus;
    const isBuschCol = (originCampus === "Busch" && destCampus === "College Ave") || (originCampus === "College Ave" && destCampus === "Busch");
    const isBuschLiv = (originCampus === "Busch" && destCampus === "Livingston") || (originCampus === "Livingston" && destCampus === "Busch");
    const isWeekend = new Date().getDay() === 0 || new Date().getDay() === 6;

    let fallbackRoutes: any[] = [];
    if (isSame) {
      const primaryBus = isWeekend ? "Weekend 2" : (originCampus === "Busch" ? "Route B" : originCampus === "College Ave" ? "Route EE" : "Route B");
      fallbackRoutes = [
        {
          name: "Campus Pedestrian Walk",
          type: "Walking Path",
          estimated_minutes: 5,
          rush_hour_minutes: 6,
          badge: "Recommended",
          description: `Direct pedestrian walk between buildings on ${originCampus} (cuts straight across campus walkways without taking the outer bus loop).`
        },
        {
          name: "Rutgers E-Scooter / Bike",
          type: "Bike / E-Scooter",
          estimated_minutes: 3,
          rush_hour_minutes: 4,
          badge: "Fastest Active",
          description: `Hop on a Veo e-scooter or bike for quick cross-building transit on ${originCampus}.`
        },
        {
          name: primaryBus,
          type: "Campus Bus",
          estimated_minutes: 8,
          rush_hour_minutes: 12,
          badge: "Perimeter Bus Loop",
          description: `Bus following the outer roadway loop on ${originCampus}. Note: vehicles take the outer road rather than direct pedestrian walkways.`
        }
      ];
    } else {
      fallbackRoutes = [
        {
          name: isBuschCol ? "Weekend 2" : isBuschLiv ? "Route B (Direct)" : "Route LX (Express)",
          type: "Direct Bus",
          estimated_minutes: isBuschCol ? 16 : isBuschLiv ? 7 : 10,
          rush_hour_minutes: isBuschCol ? 22 : 14,
          badge: "Recommended",
          description: isBuschCol
            ? "Clockwise loop running directly from Busch into College Ave (The Yard & Student Center)."
            : "Board express line directly to your destination."
        },
        {
          name: "Rutgers E-Scooter / Bike",
          type: "Bike / E-Scooter",
          estimated_minutes: 17,
          rush_hour_minutes: 18,
          description: "Cross the Landing Lane Bridge and Johnson Park path straight into College Ave."
        },
        {
          name: "Knight Mover / Student Escort",
          type: "On-Demand Transit",
          estimated_minutes: 20,
          rush_hour_minutes: 25,
          description: "Request Rutgers Knight Mover for direct on-demand student center pickup."
        },
        {
          name: "Weekend 1 (Counter-Clockwise Loop)",
          type: "Loop Bus",
          estimated_minutes: 26,
          rush_hour_minutes: 32,
          description: "Circles Busch -> Livingston -> Cook/Douglass -> College Ave. Reliable if Weekend 2 is full."
        }
      ];
    }

    const fallbackPlan = {
      origin: originCampus,
      destination: destCampus,
      routes: fallbackRoutes,
      primary_route: fallbackRoutes[0].name,
      base_minutes: fallbackRoutes[0].estimated_minutes,
      advice: fallbackRoutes[0].description
    };

    setPlanResult(fallbackPlan);
    const stillServesFallback = selectedRoute && fallbackRoutes.some((r: any) => r.name === selectedRoute.name);
    if (!stillServesFallback && fallbackRoutes.length > 0) {
      setSelectedRoute(fallbackRoutes[0]);
    }
  };

  // Automatically calculate route on mount and when origin or destination changes
  useEffect(() => {
    handleCalculateRoute();
  }, [originCampus, destCampus]);

  const getFriendlyBuildingDisplay = (cls: ClassItem): string => {
    if (cls.location === '(Online)' || cls.campus === '(Online)') return '(Online)';
    const bldg = (cls.building || '').trim();
    const loc = (cls.location || '').trim();

    // If building is concise like "SEC (Room: 202)" or "SERC 202" or "Hill Center 114"
    if (bldg && bldg.length < 32 && !bldg.toLowerCase().includes('rutgers university')) {
      if (bldg.toUpperCase().includes('SEC') && !bldg.toUpperCase().includes('SERC')) {
        return bldg.replace(/SEC/gi, 'SERC');
      }
      return bldg;
    }

    // If location has full address "Science and Engineering Resource Center, Rutgers University, ..."
    if (loc.includes(',')) {
      const firstPart = loc.split(',')[0].trim();
      if (firstPart.length > 0) return firstPart;
    }
    return bldg || loc || 'Rutgers Campus';
  };

  const handleGetToNextClass = async (specificClass?: ClassItem) => {
    let targetClass = specificClass;
    if (!targetClass) {
      const up = getNextUpcomingClass(classes);
      if (!up.nextClass) {
        alert("Please connect your default calendar or upload your course schedule first.");
        return;
      }
      targetClass = up.nextClass;
    }

    const targetCampus = targetClass.campus || "College Ave";
    const cleanBuilding = getFriendlyBuildingDisplay(targetClass);
    const targetBuilding = (cleanBuilding && cleanBuilding !== '(Online)')
      ? cleanBuilding
      : (targetClass.building || targetClass.location || targetCampus);

    if (targetClass.location === "(Online)" || targetClass.campus === "(Online)") {
      alert(`${targetClass.course} is an Online class - no transit navigation needed!`);
      return;
    }

    setTargetLocation(targetBuilding);

    let currentOrigin = originCampus;
    if (resolvedGeo) {
      currentOrigin = resolvedGeo.campus;
    } else if (currentLocation.includes("Busch")) currentOrigin = "Busch";
    else if (currentLocation.includes("Livingston")) currentOrigin = "Livingston";
    else if (currentLocation.includes("College")) currentOrigin = "College Ave";
    else if (currentLocation.includes("Cook") || currentLocation.includes("Douglass")) currentOrigin = "Cook";

    setOriginCampus(currentOrigin);
    setDestCampus(targetCampus);
    setMobileTab('map');

    try {
      const res = await fetch(`${API_BASE_URL}/api/plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin_campus: currentOrigin,
          destination_campus: targetCampus,
          target_arrival_time: targetClass.startTime || "12:00",
          origin_name: currentLocation,
          destination_name: targetBuilding,
          username: currentUser?.netId,
          prefer_walking: currentUser?.preferences?.prefer_walking
        })
      });
      if (res.ok) {
        const data = await res.json();
        setPlanResult(data);
        if (data.routes && data.routes.length > 0) {
          setSelectedRoute(data.routes[0]);
        }
        return;
      }
    } catch {
      // Fallback calculation
    }

    const isSame = currentOrigin === targetCampus;
    const fallbackPlan = {
      origin: currentOrigin,
      destination: targetCampus,
      routes: [
        {
          name: isSame ? "Campus Pedestrian Walk" : "Weekend 2 Direct",
          type: isSame ? "Walking Path" : "Direct Bus",
          estimated_minutes: isSame ? 5 : 16,
          rush_hour_minutes: isSame ? 7 : 20,
          badge: "Recommended",
          description: isSame ? `Direct pedestrian walk to ${targetBuilding}.` : `Board express line directly to ${targetCampus}.`
        },
        {
          name: "Rutgers E-Scooter / Bike",
          type: "Bike / E-Scooter",
          estimated_minutes: isSame ? 3 : 17,
          rush_hour_minutes: isSame ? 4 : 18,
          description: "Bike or e-scooter across dedicated campus trails."
        }
      ],
      primary_route: isSame ? "Walk" : "Weekend 2",
      base_minutes: isSame ? 5 : 16,
      advice: `Heading to ${targetClass.course} at ${targetClass.startTime} on ${targetCampus}.`
    };

    setPlanResult(fallbackPlan);
    setSelectedRoute(fallbackPlan.routes[0]);
  };

  const handleSwapCampuses = () => {
    const tempCampus = originCampus;
    const tempLoc = currentLocation;
    setOriginCampus(destCampus);
    setDestCampus(tempCampus);
    setCurrentLocation(targetLocation);
    setTargetLocation(tempLoc);
  };

  // Dynamically resolve target coordinates and find the nearest bus stop (ZERO HARDCODING)
  const resolvedDestCoords = useMemo(() => {
    return resolveLocationCoords(targetLocation || destCampus, destCampus);
  }, [targetLocation, destCampus]);

  const resolvedNearestStop = useMemo(() => {
    return findNearestBusStop(resolvedDestCoords, destCampus, selectedRoute?.name);
  }, [resolvedDestCoords, destCampus, selectedRoute?.name]);

  const resolvedOrigCoords = useMemo(() => {
    return resolveLocationCoords(currentLocation || originCampus, originCampus);
  }, [currentLocation, originCampus]);

  const resolvedBoardingStop = useMemo(() => {
    return findNearestBusStop(resolvedOrigCoords, originCampus, selectedRoute?.name);
  }, [resolvedOrigCoords, originCampus, selectedRoute?.name]);

  const handleSyncCalendar = async () => {
    setIsCalendarSyncing(true);
    try {
      const result = await syncDefaultDeviceCalendar();
      if (result.success && result.classes && result.classes.length > 0) {
        setClasses(result.classes);
        try {
          const savedUser = localStorage.getItem('scarlethop_auth_user');
          const u = savedUser ? JSON.parse(savedUser) : null;
          await fetch(`${API_BASE_URL}/api/calendar/device-sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ classes: result.classes, username: u?.netId || 'ar2783' })
          });
        } catch (e) {
          console.warn("Could not persist synced classes to profile:", e);
        }
        alert(`Successfully synced ${result.classes.length} classes from your device calendar!`);
        const up = getNextUpcomingClass(result.classes);
        if (up.nextClass) {
          handleGetToNextClass(up.nextClass);
        }
      } else if (result.source === 'web') {
        // On laptop/desktop, refresh latest synced classes from SQLite backend
        let refreshedFromProfile = false;
        try {
          const savedUser = localStorage.getItem('scarlethop_auth_user');
          const u = savedUser ? JSON.parse(savedUser) : null;
          const res = await fetch(`${API_BASE_URL}/api/calendar/device-sync${u?.netId ? `?username=${u.netId}` : ''}`);
          if (res.ok) {
            const data = await res.json();
            if (data?.classes && data.classes.length > 0) {
              setClasses(sortClassesByDateAndTime(data.classes));
              alert(`Successfully synced ${data.classes.length} classes from your shared calendar!`);
              refreshedFromProfile = true;
            }
          }
        } catch (e) {
          console.warn("Could not reload classes from profile:", e);
        }

        if (!refreshedFromProfile) {
          alert("On computer/laptop, please select your .ics schedule file or WebReg screenshot to sync your classes.");
          scheduleFileInputRef.current?.click();
        }
      } else if (result.success && result.classes && result.classes.length === 0) {
        alert("Connected to calendar, but no classes with Rutgers locations were found. Please verify your calendar events or upload your schedule.");
      } else if (result.error) {
        alert("Calendar Notice: " + result.error);
      }
    } catch (err: any) {
      console.warn("Calendar sync error:", err);
      alert("Calendar sync error: " + (err?.message || "Failed to access calendar."));
    } finally {
      setIsCalendarSyncing(false);
    }
  };

  // Mobile Device: Auto-sync default calendar on app launch
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      syncDefaultDeviceCalendar().then(res => {
        if (res.success && res.classes && res.classes.length > 0) {
          setClasses(res.classes);
          try {
            const savedUser = localStorage.getItem('scarlethop_auth_user');
            const u = savedUser ? JSON.parse(savedUser) : null;
            fetch(`${API_BASE_URL}/api/calendar/device-sync`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ classes: res.classes, username: u?.netId || 'ar2783' })
            }).catch(() => {});
          } catch {}
        }
      }).catch(err => {
        console.log("Background calendar auto-sync skipped:", err);
      });
    }
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setUploading(true);
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append("file", file);

    // Pass logged in username if authenticated
    try {
      const savedUser = localStorage.getItem('scarlethop_auth_user');
      if (savedUser) {
        const u = JSON.parse(savedUser);
        if (u?.netId) {
          formData.append("username", u.netId);
        }
      }
    } catch {
      // ignore
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 35000);

    try {
      console.log(`[Upload] Uploading ${file.name} (${file.type || 'file'}) to ${API_BASE_URL}/api/schedule/upload...`);
      const res = await fetch(`${API_BASE_URL}/api/schedule/upload`, {
        method: "POST",
        body: formData,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        if (data.status === "missing_api_key") {
          alert("Notice: GEMINI_API_KEY is not set in your .env file.\n\nTo parse your custom WebReg screenshot, add GEMINI_API_KEY=your_key to your .env file and restart the backend.");
        } else if (data.status === "error") {
          alert("OCR Parsing Notice: " + (data.message || "Failed to parse image. Please ensure the image is clear."));
        } else if (data.classes && data.classes.length > 0) {
          const sorted = sortClassesByDateAndTime(data.classes);
          setIsSessionUploaded(true);
          setClasses(sorted);
          alert(`Successfully imported ${sorted.length} class meetings!`);
        } else {
          alert(data.message || "No classes were detected. Please make sure the uploaded image or .ics file contains class schedule details.");
        }
      } else {
        alert(`Server returned an error during schedule upload (${res.status}). Please verify backend is running on ${API_BASE_URL}.`);
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      console.error("Upload error:", err);
      if (err.name === 'AbortError') {
        alert(`Schedule upload timed out after 35 seconds. Please check that the backend server is reachable at ${API_BASE_URL}.`);
      } else {
        alert(`Could not connect to backend server at ${API_BASE_URL}/api/schedule/upload: ${err?.message || err}`);
      }
    } finally {
      clearTimeout(timeoutId);
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleDeleteClass = async (targetClass: ClassItem) => {
    const updated = classes.filter(c => c !== targetClass);
    setClasses(updated);

    // Persist deletion immediately to SQLite database
    try {
      const savedUser = localStorage.getItem('scarlethop_auth_user');
      const u = savedUser ? JSON.parse(savedUser) : null;
      await fetch(`${API_BASE_URL}/api/calendar/device-sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classes: updated, username: u?.netId || 'ar2783' })
      });
    } catch (err) {
      console.warn("Failed to delete class from SQL:", err);
    }
  };

  const handleClearAllClasses = async () => {
    if (!window.confirm("Clear all classes from your schedule?")) return;
    setClasses([]);

    // Clear from SQLite database
    try {
      const savedUser = localStorage.getItem('scarlethop_auth_user');
      const u = savedUser ? JSON.parse(savedUser) : null;
      await fetch(`${API_BASE_URL}/api/calendar/device-sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classes: [], username: u?.netId || 'ar2783' })
      });
    } catch (err) {
      console.warn("Failed to clear classes from SQL:", err);
    }
  };

  const upcomingClass = classes.length > 0 ? classes[0] : null;

  return (
    <div className="apple-app-container">
      {/* 1. Apple Navigation Bar: Balanced, Deferent, Clean */}
      <header className="apple-nav-header">
        {/* Left: Apple Brand Wordmark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '9px',
            background: 'linear-gradient(135deg, var(--apple-accent) 0%, var(--apple-accent-dark) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 10px var(--apple-accent-glow)'
          }}>
            <WingedSneakerIcon size={20} color="#fff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <h1 style={{ fontSize: '16px', fontWeight: 700, letterSpacing: '-0.025em', color: 'var(--apple-label-primary)', margin: 0 }}>
                Scarlet<span style={{ color: 'var(--apple-accent)' }}>Hop</span>
              </h1>
              <span style={{
                fontSize: '10px',
                fontWeight: 700,
                color: 'var(--apple-label-tertiary)',
                background: 'var(--apple-surface-tag)',
                padding: '1px 5px',
                borderRadius: '4px'
              }}>
                MAPS
              </span>
            </div>
          </div>
        </div>


        {/* Right: Clean Apple Controls Group */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {/* Siri Copilot Drawer Trigger */}
          <button
            onClick={() => setShowCopilotModal(prev => !prev)}
            className="apple-btn-secondary"
            style={{ fontSize: '12px', padding: '5px 10px', gap: '5px' }}
            title="Ask Transit Copilot"
          >
            <Sparkles size={13} color="#BF5AF2" />
            <span className="btn-label-desktop">Copilot</span>
          </button>

          {/* Location button */}
          <button
            onClick={handleLocationPillClick}
            className="apple-btn-secondary"
            style={{ fontSize: '12px', padding: '5px 10px', gap: '5px' }}
            title="Zoom to your current location"
          >
            <LocateFixed size={12} color={geoStatus === "granted" ? "#30D158" : "var(--apple-label-secondary)"} />
            <span className="btn-label-desktop">{geoStatus === "granted" ? originCampus : "Location"}</span>
          </button>

          {/* Widget trigger */}
          <div style={{ position: 'relative' }}>
            <button
              ref={widgetTriggerRef}
              onClick={() => setShowWidgetOverlay(prev => !prev)}
              className="apple-btn-secondary"
              style={{ fontSize: '12px', padding: '5px 10px', gap: '5px' }}
              title="Quick Widget Overlay"
            >
              <Code size={12} color="var(--apple-accent)" />
              <span className="btn-label-desktop">Widget</span>
            </button>

            <TransitWidget
              isOpen={showWidgetOverlay}
              onClose={() => setShowWidgetOverlay(false)}
              triggerRef={widgetTriggerRef}
              currentCampus={currentLocation}
              nextClass={upcomingClass || undefined}
            />
          </div>

          {/* Profile Menu Trigger */}
          <div style={{ position: 'relative' }}>
            <button
              ref={profileTriggerRef}
              onClick={() => setShowProfileMenu(prev => !prev)}
              className="apple-btn-secondary"
              style={{
                fontSize: '12px',
                padding: '5px 10px',
                gap: '5px',
                background: showProfileMenu ? 'var(--apple-accent-subtle)' : undefined,
                borderColor: showProfileMenu ? 'var(--apple-accent)' : undefined
              }}
              title="Profile & Settings (Sign Up / Login, Light / Dark Mode)"
            >
              <User size={13} color="var(--apple-accent)" />
              <span className="btn-label-desktop">Profile</span>
            </button>

            <ProfileMenu
              isOpen={showProfileMenu}
              onClose={() => {
                setShowProfileMenu(false);
                try {
                  const saved = localStorage.getItem('scarlethop_auth_user');
                  setCurrentUser(saved ? JSON.parse(saved) : null);
                } catch {}
              }}
              triggerRef={profileTriggerRef}
              theme={theme}
              onToggleTheme={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
              onSelectTheme={(t) => setTheme(t)}
              onSyncCalendar={handleSyncCalendar}
              onClassesLoaded={(loadedClasses) => {
                try {
                  const saved = localStorage.getItem('scarlethop_auth_user');
                  setCurrentUser(saved ? JSON.parse(saved) : null);
                } catch {}
                setClasses(sortClassesByDateAndTime(loadedClasses));
              }}
              onLogin={(loggedInUser) => {
                setCurrentUser(loggedInUser);
                setIsSessionUploaded(false);
                fetchScheduleFromDb(loggedInUser, false);
              }}
              onLogout={() => {
                setCurrentUser(null);
                setIsSessionUploaded(false);
                setClasses([]);
              }}
            />
          </div>
        </div>
      </header>

      {/* Mobile Segmented View Control: Apple HIG View Switcher */}
      <div className="apple-mobile-tab-bar">
        <div className="apple-segmented-control" style={{ width: '100%', maxWidth: '340px' }}>
          <button
            onClick={() => setMobileTab('map')}
            className={`apple-segment-btn ${mobileTab === 'map' ? 'active' : ''}`}
            style={{ flex: 1, padding: '6px 12px' }}
          >
            <Navigation size={13} />
            <span>Live Map</span>
          </button>
          <button
            onClick={() => setMobileTab('routes')}
            className={`apple-segment-btn ${mobileTab === 'routes' ? 'active' : ''}`}
            style={{ flex: 1, padding: '6px 12px' }}
          >
            <Calendar size={13} />
            <span>Routes & Schedule</span>
          </button>
        </div>
      </div>

      {/* 2. Apple Dual-Pane Workspace */}
      <main className="apple-main-workspace">
        {/* Left Sheet: Combined Directions & Schedule with Apple HIG */}
        <div className={`apple-sidebar-sheet ${mobileTab === 'routes' ? 'mobile-active' : ''}`}>
          <div className="apple-panel" style={{
            padding: '16px',
            height: '100%',
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            overflowY: 'auto',
            boxSizing: 'border-box'
          }}>
            {/* ========================================================
                HERO: WHAT'S NEXT & WEATHER ADVISORY
                ======================================================== */}
            {upcomingClassInfo.nextClass ? (
              <div style={{
                background: 'linear-gradient(135deg, rgba(204, 0, 51, 0.08) 0%, rgba(204, 0, 51, 0.02) 100%)',
                border: '1px solid rgba(204, 0, 51, 0.22)',
                borderRadius: '14px',
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Sparkles size={14} color="var(--apple-accent)" />
                    <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--apple-accent)' }}>
                      What's Next
                    </span>
                  </div>
                  {upcomingClassInfo.minutesUntil !== null && (
                    <span style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '10px',
                      background: 'var(--apple-accent)',
                      color: '#FFFFFF'
                    }}>
                      Leave in ~{Math.max(1, (upcomingClassInfo.minutesUntil || 20) - (planResult?.base_minutes || 10))} min
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <div>
                    <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--apple-label-primary)' }}>
                      {upcomingClassInfo.nextClass.course}
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--apple-label-secondary)', marginTop: '2px' }}>
                      📍 {getFriendlyBuildingDisplay(upcomingClassInfo.nextClass)} • {upcomingClassInfo.nextClass.startTime} ({upcomingClassInfo.dayLabel})
                    </div>
                  </div>
                  <button
                    onClick={() => handleGetToNextClass(upcomingClassInfo.nextClass || undefined)}
                    className="apple-btn-primary"
                    style={{ fontSize: '11px', padding: '6px 12px', flexShrink: 0 }}
                  >
                    Go Now ➔
                  </button>
                </div>

                {weatherData?.current && (
                  <div style={{
                    fontSize: '11px',
                    color: 'var(--apple-label-secondary)',
                    paddingTop: '6px',
                    borderTop: '1px solid var(--apple-border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <span>{weatherData.current.summary}</span>
                    <span>•</span>
                    <span style={{ color: weatherData.bad_weather_for_user ? '#FF9F0A' : 'var(--apple-label-primary)' }}>
                      {weatherData.bad_weather_for_user ? `⚠️ ${weatherData.reason || 'Bad weather'} (Bus advised)` : weatherData.current.commute_advice || 'Great weather for walking'}
                    </span>
                  </div>
                )}
              </div>
            ) : weatherData?.current ? (
              <div style={{
                background: 'var(--apple-surface-card)',
                border: '1px solid var(--apple-border-subtle)',
                borderRadius: '12px',
                padding: '9px 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '11px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>🌤️</span>
                  <span style={{ fontWeight: 650, color: 'var(--apple-label-primary)' }}>{weatherData.current.summary}</span>
                  <span style={{ color: 'var(--apple-label-secondary)' }}>• {weatherData.current.commute_advice}</span>
                </div>
              </div>
            ) : null}

            {/* ========================================================
                SECTION 1: COURSE SCHEDULE (TOP)
                ======================================================== */}
            <div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '10px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                  <Calendar size={15} color="var(--apple-accent)" />
                  <h2 style={{ fontSize: '14.5px', fontWeight: 700, color: 'var(--apple-label-primary)', margin: 0, letterSpacing: '-0.015em' }}>
                    Course Schedule
                  </h2>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    onClick={() => fetchScheduleFromDb(currentUser, true)}
                    disabled={isDbRefreshing}
                    className="apple-btn-secondary"
                    style={{
                      fontSize: '11px',
                      padding: '4px 7px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      cursor: isDbRefreshing ? 'wait' : 'pointer',
                      borderRadius: '8px'
                    }}
                    title="Refresh schedule from database"
                  >
                    <RefreshCw size={11} className={isDbRefreshing ? "spin" : ""} color="var(--apple-accent)" />
                    <span style={{ fontSize: '10.5px' }}>Refresh</span>
                  </button>
                  {classes.length > 0 && (
                    <button
                      onClick={handleClearAllClasses}
                      className="apple-btn-secondary"
                      style={{ fontSize: '11px', padding: '4px 8px', color: '#FF453A', borderRadius: '8px' }}
                      title="Clear all imported classes"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Apple Day Segmented Control */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
                <div className="apple-segmented-control" style={{ width: '100%', justifyContent: 'space-between' }}>
                  {["ALL", "M", "T", "W", "TH", "F"].map((day) => (
                    <button
                      key={day}
                      onClick={() => setSelectedDayFilter(day)}
                      className={`apple-segment-btn ${selectedDayFilter === day ? 'active' : ''}`}
                      style={{ flex: 1, padding: '3px 6px', fontSize: '11px' }}
                    >
                      {day === "ALL" ? "All" : day}
                    </button>
                  ))}
                </div>
              </div>

              {/* Class List */}
              {classes.length === 0 ? (
                <div style={{
                  padding: '18px 16px',
                  borderRadius: '14px',
                  background: 'var(--apple-surface-card)',
                  border: '1px dashed var(--apple-border)',
                  textAlign: 'center'
                }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: 'var(--apple-accent-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 10px'
                  }}>
                    <Calendar size={18} color="var(--apple-accent)" />
                  </div>
                  <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--apple-label-primary)', margin: '0 0 4px' }}>
                    {!currentUser && !Capacitor.isNativePlatform() ? "Sign in to view schedule" : "No classes loaded yet"}
                  </h3>
                  <p style={{ fontSize: '11.5px', color: 'var(--apple-label-secondary)', lineHeight: 1.45, margin: '0 auto 14px', maxWidth: '270px' }}>
                    {!currentUser && !Capacitor.isNativePlatform()
                      ? "Sign in with your Rutgers NetID to sync your saved classes from the database, or upload your .ics calendar file."
                      : "Sync your device calendar or upload an .ics file / WebReg screenshot to view your schedule and bus routes."}
                  </p>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                    {!currentUser && !Capacitor.isNativePlatform() ? (
                      <button
                        onClick={() => setShowProfileMenu(true)}
                        className="apple-btn-primary"
                        style={{ fontSize: '11.5px', padding: '6px 14px' }}
                      >
                        <User size={12} />
                        <span>Sign In</span>
                      </button>
                    ) : (
                      <button
                        onClick={handleSyncCalendar}
                        disabled={isCalendarSyncing}
                        className="apple-btn-primary"
                        style={{ fontSize: '11.5px', padding: '6px 12px', cursor: isCalendarSyncing ? 'wait' : 'pointer' }}
                      >
                        {isCalendarSyncing ? <RefreshCw size={11} className="spin" /> : <Calendar size={11} />}
                        <span>{isCalendarSyncing ? "Syncing..." : "Sync Calendar"}</span>
                      </button>
                    )}
                    <label className="apple-btn-secondary" style={{ fontSize: '11.5px', padding: '6px 12px', cursor: 'pointer' }}>
                      <Upload size={11} />
                      <span>{uploading ? "Importing..." : "Upload .ics / Image"}</span>
                      <input type="file" accept="image/*,.ics,text/calendar" onChange={handleFileUpload} style={{ display: 'none' }} />
                    </label>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                  {classes
                    .filter(cls => {
                      if (selectedDayFilter === "ALL") return true;
                      const days = Array.isArray(cls.days) ? cls.days : [cls.days];
                      return days.includes(selectedDayFilter);
                    })
                    .map((cls, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: '9px 12px',
                          borderRadius: '12px',
                          background: 'var(--apple-surface-card)',
                          border: '1px solid var(--apple-border-subtle)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '8px'
                        }}
                      >
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--apple-label-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {cls.course}
                          </div>
                          <div style={{ fontSize: '10.5px', color: 'var(--apple-label-secondary)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <MapPin size={10} color="var(--apple-accent)" />
                            {cls.zoom_link ? (() => {
                              const safeZoomUrl = cls.zoom_link.startsWith('http://') || cls.zoom_link.startsWith('https://')
                                ? cls.zoom_link
                                : `https://${cls.zoom_link}`;
                              return (
                                <a
                                  href={safeZoomUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    window.open(safeZoomUrl, '_blank', 'noopener,noreferrer');
                                  }}
                                  style={{ color: '#0b84fe', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '2px', fontWeight: 500, cursor: 'pointer' }}
                                  title="Open Zoom meeting in new tab"
                                  onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                                  onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                                >
                                  📹 Join Zoom Call
                                </a>
                              );
                            })() : cls.location === '(Online)' || cls.campus === '(Online)' ? (
                              <span style={{ color: 'var(--apple-label-tertiary)', fontStyle: 'italic' }}>(Online)</span>
                            ) : (
                              <a
                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cls.location || cls.building)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: 'inherit', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                title={`Search on Google Maps: ${cls.location || cls.building}`}
                                onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                                onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                              >
                                {getFriendlyBuildingDisplay(cls)}
                              </a>
                            )}
                          </div>
                        </div>

                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--apple-accent)', fontVariantNumeric: 'tabular-nums' }}>
                            {cls.startTime} - {cls.endTime}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '3px', justifyContent: 'flex-end' }}>
                            {cls.zoom_link ? (() => {
                              const safeZoomUrl = cls.zoom_link.startsWith('http://') || cls.zoom_link.startsWith('https://')
                                ? cls.zoom_link
                                : `https://${cls.zoom_link}`;
                              return (
                                <a
                                  href={safeZoomUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    window.open(safeZoomUrl, '_blank', 'noopener,noreferrer');
                                  }}
                                  className="apple-btn-primary"
                                  style={{
                                    padding: '3px 8px',
                                    fontSize: '10.5px',
                                    textDecoration: 'none',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                    background: 'linear-gradient(135deg, #0b84fe 0%, #0056b3 100%)',
                                    color: '#fff',
                                    borderRadius: '6px',
                                    cursor: 'pointer'
                                  }}
                                  title="Open Zoom meeting in new tab"
                                >
                                  📹 Zoom
                                </a>
                              );
                            })() : cls.location !== '(Online)' && cls.campus !== '(Online)' ? (
                              <button
                                onClick={() => handleGetToNextClass(cls)}
                                className="apple-btn-secondary"
                                style={{ padding: '3px 8px', fontSize: '10.5px' }}
                                title="Calculate transit & start map navigation to this class"
                              >
                                Route ➔
                              </button>
                            ) : (
                              <span style={{ fontSize: '10px', color: 'var(--apple-label-tertiary)', padding: '2px 6px', borderRadius: '4px', background: 'var(--apple-card-bg-inset)' }}>
                                Online
                              </span>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteClass(cls);
                              }}
                              className="apple-icon-btn"
                              style={{
                                width: '22px',
                                height: '22px',
                                borderRadius: '6px',
                                background: 'rgba(255, 69, 58, 0.12)',
                                border: '1px solid rgba(255, 69, 58, 0.25)',
                                color: '#FF453A'
                              }}
                              title={`Delete ${cls.course} from schedule`}
                            >
                              <Trash2 size={11} color="#FF453A" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}

              {/* Subtle Divider */}
              <div style={{ height: '1px', background: 'var(--apple-border-subtle)', margin: '2px 0' }} />

              {/* ========================================================
                SECTION 2: DIRECTIONS & TRANSIT OPTIONS (BELOW SCHEDULE)
                ======================================================== */}
              <div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '10px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                    <Navigation size={15} color="var(--apple-accent)" />
                    <h2 style={{ fontSize: '14.5px', fontWeight: 700, color: 'var(--apple-label-primary)', margin: 0, letterSpacing: '-0.015em' }}>
                      Directions
                    </h2>
                  </div>
                </div>

                {/* Apple Maps Origin / Destination Form Card (Minimized by Default) */}
                <div style={{
                  background: 'var(--apple-card-bg)',
                  borderRadius: '14px',
                  padding: isRouteFormExpanded ? '12px' : '9px 12px',
                  border: '1px solid var(--apple-border)',
                  marginBottom: '10px',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                }}>
                  {/* Minimized Summary Header / Toggle Button */}
                  <div
                    onClick={() => setIsRouteFormExpanded(prev => !prev)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      userSelect: 'none'
                    }}
                    title={isRouteFormExpanded ? "Click to minimize departure/destination box" : "Click to edit departure/destination"}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                      <div style={{
                        width: '22px',
                        height: '22px',
                        borderRadius: '6px',
                        background: 'var(--apple-accent-subtle)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <Navigation size={11} color="var(--apple-accent)" />
                      </div>

                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{
                          fontSize: '12px',
                          fontWeight: 650,
                          color: 'var(--apple-label-primary)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px'
                        }}>
                          <span style={{ color: 'var(--apple-label-primary)' }}>{originCampus}</span>
                          <span style={{ color: 'var(--apple-label-tertiary)', fontSize: '10px' }}>➔</span>
                          <span style={{ color: '#30D158' }}>{destCampus}</span>
                        </div>
                        {!isRouteFormExpanded && (
                          <div style={{
                            fontSize: '10.5px',
                            color: 'var(--apple-label-secondary)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            marginTop: '1px'
                          }}>
                            From: {currentLocation} ➔ To: {targetLocation}
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        color: isRouteFormExpanded ? 'var(--apple-accent)' : 'var(--apple-label-secondary)',
                        padding: '2px 7px',
                        borderRadius: '6px',
                        background: 'var(--apple-surface-subtle)'
                      }}>
                        {isRouteFormExpanded ? 'Collapse' : 'Change'}
                      </span>
                      <ChevronDown
                        size={13}
                        color="var(--apple-label-secondary)"
                        style={{
                          transform: isRouteFormExpanded ? 'rotate(180deg)' : 'none',
                          transition: 'transform 0.22s ease'
                        }}
                      />
                    </div>
                  </div>

                  {/* Expanded Form Fields */}
                  {isRouteFormExpanded && (
                    <div style={{
                      marginTop: '10px',
                      paddingTop: '10px',
                      borderTop: '1px solid var(--apple-border-subtle)',
                      animation: 'apple-fade-in 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                    }}>
                      {/* Departure Group Card */}
                      <div style={{
                        background: 'var(--apple-surface-card)',
                        borderRadius: '12px',
                        border: '1px solid var(--apple-border-subtle)',
                        padding: '10px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#30D158', boxShadow: '0 0 6px #30D158', flexShrink: 0 }} />
                          <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#30D158', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                            Departing From
                          </span>
                        </div>

                        <div>
                          <label style={{ fontSize: '11px', color: 'var(--apple-label-secondary)', display: 'block', marginBottom: '4px' }}>
                            Campus
                          </label>
                          <select
                            value={originCampus}
                            onChange={(e) => {
                              const newCamp = e.target.value;
                              setOriginCampus(newCamp);
                              if (resolvedGeo && matchCampus(resolvedGeo.campus, newCamp)) {
                                setCurrentLocation(resolvedGeo.locationName);
                              } else if (newCamp === "College Ave") {
                                setCurrentLocation("College Ave Student Center");
                              } else if (newCamp === "Busch") {
                                setCurrentLocation("Busch Student Center");
                              } else if (newCamp === "Livingston") {
                                setCurrentLocation("Livingston Student Center");
                              } else if (newCamp === "Cook") {
                                setCurrentLocation("College Hall");
                              }
                            }}
                            className="apple-select-box"
                          >
                            <option value="Busch" style={{ background: 'var(--apple-option-bg)', color: 'var(--apple-label-primary)' }}>Busch Campus</option>
                            <option value="Livingston" style={{ background: 'var(--apple-option-bg)', color: 'var(--apple-label-primary)' }}>Livingston Campus</option>
                            <option value="College Ave" style={{ background: 'var(--apple-option-bg)', color: 'var(--apple-label-primary)' }}>College Ave Campus</option>
                            <option value="Cook" style={{ background: 'var(--apple-option-bg)', color: 'var(--apple-label-primary)' }}>Cook / Douglass Campus</option>
                          </select>
                        </div>

                        <div>
                          <label style={{ fontSize: '11px', color: 'var(--apple-label-secondary)', display: 'block', marginBottom: '4px' }}>
                            Starting Location / Building
                          </label>
                          <select
                            value={currentLocation}
                            onChange={(e) => setCurrentLocation(e.target.value)}
                            className="apple-select-box"
                          >
                            {/* GPS Current Location if detected on this campus */}
                            {resolvedGeo && matchCampus(resolvedGeo.campus, originCampus) && (
                              <option value={resolvedGeo.locationName} style={{ background: 'var(--apple-option-bg)', color: 'var(--apple-label-primary)' }}>
                                📍 Current Location ({resolvedGeo.locationName})
                              </option>
                            )}

                            {/* Primary Student Center / Hub */}
                            <option value={
                              originCampus === "College Ave" ? "College Ave Student Center" :
                                originCampus === "Busch" ? "Busch Student Center" :
                                  originCampus === "Livingston" ? "Livingston Student Center" : "College Hall"
                            } style={{ background: 'var(--apple-option-bg)', color: 'var(--apple-label-primary)' }}>
                              {originCampus === "College Ave" ? "College Ave Student Center (CASC)" :
                                originCampus === "Busch" ? "Busch Student Center (BSC)" :
                                  originCampus === "Livingston" ? "Livingston Student Center (LSC)" : "College Hall"}
                            </option>

                            {/* Fallback for custom or resolved location name if not already listed */}
                            {currentLocation &&
                              currentLocation !== (resolvedGeo?.locationName) &&
                              currentLocation !== (originCampus === "College Ave" ? "College Ave Student Center" : originCampus === "Busch" ? "Busch Student Center" : originCampus === "Livingston" ? "Livingston Student Center" : "College Hall") &&
                              !RUTGERS_BUILDINGS.some(b => b.name === currentLocation) &&
                              !RUTGERS_BUS_STOPS.some(s => s.name === currentLocation) && (
                                <option value={currentLocation} style={{ background: 'var(--apple-option-bg)', color: 'var(--apple-label-primary)' }}>
                                  📍 {currentLocation}
                                </option>
                              )}

                            {/* All Campus Buildings */}
                            {RUTGERS_BUILDINGS.filter(b => matchCampus(b.campus, originCampus) && !b.name.includes("Student Center")).map(b => (
                              <option key={b.name} value={b.name} style={{ background: 'var(--apple-option-bg)', color: 'var(--apple-label-primary)' }}>
                                {b.name} {b.code ? `(${b.code})` : ''}
                              </option>
                            ))}

                            {/* All Campus Bus Stops */}
                            {RUTGERS_BUS_STOPS.filter(s => matchCampus(s.campus, originCampus) && !s.name.includes("Student Center")).map(s => (
                              <option key={s.name} value={s.name} style={{ background: 'var(--apple-option-bg)', color: 'var(--apple-label-primary)' }}>
                                Bus Stop: {s.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Apple Hairline Swap Divider */}
                      <div style={{
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '6px 0',
                        height: '26px'
                      }}>
                        <div style={{
                          position: 'absolute',
                          left: '12px',
                          right: '12px',
                          height: '1px',
                          background: 'var(--apple-border-subtle)'
                        }} />
                        <button
                          onClick={handleSwapCampuses}
                          className="apple-icon-btn"
                          title="Swap origin and destination"
                          style={{
                            position: 'relative',
                            zIndex: 1,
                            width: '26px',
                            height: '26px',
                            background: 'var(--apple-surface-elevated)',
                            border: '1px solid var(--apple-border)',
                            boxShadow: 'var(--apple-shadow-sm)'
                          }}
                        >
                          <ArrowDownUp size={12} color="var(--apple-label-primary)" />
                        </button>
                      </div>

                      {/* Destination Group Card */}
                      <div style={{
                        background: 'var(--apple-surface-card)',
                        borderRadius: '12px',
                        border: '1px solid var(--apple-border-subtle)',
                        padding: '10px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        marginBottom: '10px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--apple-accent)', boxShadow: '0 0 6px var(--apple-accent)', flexShrink: 0 }} />
                          <span style={{ fontSize: '10.5px', fontWeight: 700, color: 'var(--apple-accent)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                            Going To
                          </span>
                        </div>

                        <div>
                          <label style={{ fontSize: '11px', color: 'var(--apple-label-secondary)', display: 'block', marginBottom: '4px' }}>
                            Campus
                          </label>
                          <select
                            value={destCampus}
                            onChange={(e) => {
                              const newCamp = e.target.value;
                              setDestCampus(newCamp);
                              if (newCamp === "College Ave") setTargetLocation("College Ave Student Center");
                              else if (newCamp === "Busch") setTargetLocation("Busch Student Center");
                              else if (newCamp === "Livingston") setTargetLocation("Livingston Student Center");
                              else if (newCamp === "Cook") setTargetLocation("College Hall");
                            }}
                            className="apple-select-box"
                          >
                            <option value="College Ave" style={{ background: 'var(--apple-option-bg)', color: 'var(--apple-label-primary)' }}>College Ave Campus</option>
                            <option value="Livingston" style={{ background: 'var(--apple-option-bg)', color: 'var(--apple-label-primary)' }}>Livingston Campus</option>
                            <option value="Busch" style={{ background: 'var(--apple-option-bg)', color: 'var(--apple-label-primary)' }}>Busch Campus</option>
                            <option value="Cook" style={{ background: 'var(--apple-option-bg)', color: 'var(--apple-label-primary)' }}>Cook / Douglass Campus</option>
                          </select>
                        </div>

                        <div>
                          <label style={{ fontSize: '11px', color: 'var(--apple-label-secondary)', display: 'block', marginBottom: '4px' }}>
                            Next Location / Building
                          </label>
                          <select
                            value={targetLocation}
                            onChange={(e) => {
                              const newLoc = e.target.value;
                              setTargetLocation(newLoc);
                              const res = resolveLocationCoords(newLoc, destCampus);
                              if (res && res.campus && res.campus !== destCampus) {
                                setDestCampus(res.campus);
                              }
                            }}
                            className="apple-select-box"
                          >
                            {/* Primary Student Center / Hub */}
                            <option value={
                              destCampus === "College Ave" ? "College Ave Student Center" :
                                destCampus === "Busch" ? "Busch Student Center" :
                                  destCampus === "Livingston" ? "Livingston Student Center" : "College Hall"
                            } style={{ background: 'var(--apple-option-bg)', color: 'var(--apple-label-primary)' }}>
                              {destCampus === "College Ave" ? "College Ave Student Center (CASC)" :
                                destCampus === "Busch" ? "Busch Student Center (BSC)" :
                                  destCampus === "Livingston" ? "Livingston Student Center (LSC)" : "College Hall"}
                            </option>

                            {/* All Campus Buildings */}
                            {RUTGERS_BUILDINGS.filter(b => matchCampus(b.campus, destCampus) && !b.name.includes("Student Center")).map(b => (
                              <option key={b.name} value={b.name} style={{ background: 'var(--apple-option-bg)', color: 'var(--apple-label-primary)' }}>
                                {b.name} {b.code ? `(${b.code})` : ''}
                              </option>
                            ))}

                            {/* All Campus Bus Stops */}
                            {RUTGERS_BUS_STOPS.filter(s => matchCampus(s.campus, destCampus) && !s.name.includes("Student Center")).map(s => (
                              <option key={s.name} value={s.name} style={{ background: 'var(--apple-option-bg)', color: 'var(--apple-label-primary)' }}>
                                Bus Stop: {s.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Dynamic Boarding & Drop-off Stops */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '6px',
                        marginBottom: '10px'
                      }}>
                        <div style={{
                          padding: '6px 8px',
                          background: 'var(--apple-surface-card)',
                          borderRadius: '8px',
                          border: '1px solid var(--apple-border-subtle)',
                          fontSize: '10.5px'
                        }}>
                          <div style={{ color: 'var(--apple-accent)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
                            <span>▲ Board Stop:</span>
                          </div>
                          <div style={{ fontWeight: 600, color: 'var(--apple-label-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={resolvedBoardingStop.name}>
                            {resolvedBoardingStop.name}
                          </div>
                        </div>

                        <div style={{
                          padding: '6px 8px',
                          background: 'var(--apple-surface-card)',
                          borderRadius: '8px',
                          border: '1px solid var(--apple-border-subtle)',
                          fontSize: '10.5px'
                        }}>
                          <div style={{ color: '#30D158', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
                            <span>▼ Drop-off Stop:</span>
                          </div>
                          <div style={{ fontWeight: 600, color: 'var(--apple-label-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={resolvedNearestStop.name}>
                            {resolvedNearestStop.name}
                          </div>
                        </div>
                      </div>

                      {/* Compute Route Button */}
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => {
                            handleCalculateRoute();
                            setIsRouteFormExpanded(false);
                          }}
                          className="apple-btn-primary"
                          style={{ flex: 1, padding: '8px 12px', borderRadius: '10px', fontSize: '12px' }}
                        >
                          Update Routes <ArrowRight size={13} />
                        </button>
                        <button
                          onClick={() => setIsRouteFormExpanded(false)}
                          className="apple-btn-secondary"
                          style={{ padding: '8px 12px', borderRadius: '10px', fontSize: '12px' }}
                        >
                          Done
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Transit Options List (Showing Top 3 with Dropdown for More) */}
                {planResult && (() => {
                  const allRoutes = ((planResult.routes && planResult.routes.length > 0) ? planResult.routes : [
                    {
                      name: "Weekend 2",
                      type: "Bus",
                      estimated_minutes: 16,
                      badge: "Recommended",
                      description: "Clockwise loop running directly into campus."
                    }
                  ]);
                  const visibleRoutes = showAllRoutes ? allRoutes : allRoutes.slice(0, 3);
                  const hasMoreRoutes = allRoutes.length > 3;
                  const remainingCount = allRoutes.length - 3;

                  return (
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        color: 'var(--apple-label-secondary)',
                        marginBottom: '8px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}>
                        <span>Transit Options ({planResult.origin} ➔ {planResult.destination})</span>
                        <span style={{ fontSize: '10px', color: 'var(--apple-label-tertiary)' }}>
                          Top {Math.min(3, allRoutes.length)} of {allRoutes.length}
                        </span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                        {visibleRoutes.map((route: any, idx: number) => {
                          const isSelected = selectedRoute?.name === route.name;
                          const isTop = idx === 0;
                          const colorInfo = getRouteColorInfo(route.name);
                          const stops = getStopsForRoute(route.name);

                          return (
                            <div
                              key={idx}
                              onClick={() => {
                                const nextSel = isSelected ? null : route;
                                setSelectedRoute(nextSel);
                                if (nextSel) setMobileTab('map');
                              }}
                              style={{
                                padding: '11px 13px',
                                borderRadius: '13px',
                                background: isSelected
                                  ? 'var(--apple-surface-subtle)'
                                  : 'var(--apple-card-bg)',
                                border: isSelected
                                  ? `1.5px solid ${colorInfo.bg}`
                                  : '1px solid var(--apple-border-subtle)',
                                cursor: 'pointer',
                                transition: 'all 0.18s ease',
                                boxShadow: isSelected ? `0 0 16px ${colorInfo.bg}44` : 'none'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '3px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                  <span style={{
                                    padding: '3px 8px',
                                    borderRadius: '6px',
                                    background: colorInfo.bg,
                                    color: colorInfo.text,
                                    fontSize: '11.5px',
                                    fontWeight: 800
                                  }}>
                                    {route.name}
                                  </span>
                                  {route.badge ? (
                                    <span style={{
                                      fontSize: '10.5px',
                                      fontWeight: 700,
                                      padding: '2px 7px',
                                      borderRadius: '6px',
                                      background: route.badge.includes('Walk Farther') ? 'rgba(255, 159, 10, 0.18)' : 'rgba(48, 209, 88, 0.18)',
                                      color: route.badge.includes('Walk Farther') ? '#FF9F0A' : '#30D158'
                                    }}>
                                      {route.badge}
                                    </span>
                                  ) : isSelected ? (
                                    <span style={{ fontSize: '11px', color: '#30D158', fontWeight: 700 }}>
                                      ● Navigating
                                    </span>
                                  ) : isTop ? (
                                    <span style={{ fontSize: '11px', color: '#30D158', fontWeight: 600 }}>
                                      ● Recommended
                                    </span>
                                  ) : null}
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--apple-label-primary)' }}>
                                    {route.estimated_minutes} min
                                  </span>
                                  {isSelected && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedRoute(null);
                                      }}
                                      title="Deselect route / End navigation"
                                      className="apple-btn-dark-glass"
                                      style={{
                                        width: '22px',
                                        height: '22px',
                                        padding: 0,
                                        borderRadius: '50%',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        background: 'var(--apple-surface-subtle)',
                                        border: '1px solid var(--apple-border)',
                                        color: 'var(--apple-label-primary)',
                                        cursor: 'pointer',
                                        flexShrink: 0
                                      }}
                                    >
                                      <X size={12} strokeWidth={2.8} />
                                    </button>
                                  )}
                                </div>
                              </div>
                              <p style={{ fontSize: '11px', color: 'var(--apple-label-secondary)', margin: '3px 0 0', lineHeight: 1.35 }}>
                                {route.description}
                              </p>

                              {route.walk_mins !== undefined && (
                                <div style={{
                                  display: 'flex',
                                  gap: '10px',
                                  marginTop: '6px',
                                  fontSize: '10.5px',
                                  color: 'var(--apple-label-secondary)',
                                  flexWrap: 'wrap'
                                }}>
                                  <span>🚶 {route.walk_mins}m walk ({route.dist_to_stop_miles} mi)</span>
                                  {route.wait_mins > 0 && <span>⏳ {route.wait_mins}m wait</span>}
                                  <span>🚌 ~{route.bus_ride_mins}m ride</span>
                                  {route.time_saved_vs_closest > 0 && (
                                    <span style={{ color: '#FF9F0A', fontWeight: 700 }}>⚡ Saves {route.time_saved_vs_closest}m</span>
                                  )}
                                </div>
                              )}

                              {/* Stop Selector Buttons for Selected Route */}
                              {isSelected && stops.length > 0 && (
                                <div style={{
                                  marginTop: '9px',
                                  paddingTop: '8px',
                                  borderTop: '1px solid var(--apple-border-subtle)'
                                }}>
                                  <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    fontSize: '10px',
                                    fontWeight: 700,
                                    color: 'var(--apple-label-secondary)',
                                    marginBottom: '6px',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.04em'
                                  }}>
                                    <span>Stops ({stops.length})</span>
                                    <span style={{ color: 'var(--apple-accent)', fontWeight: 600 }}>Tap to Set Destination Stop</span>
                                  </div>
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                                    {stops.map((st) => {
                                      const isBoarding = resolvedBoardingStop?.name.toLowerCase() === st.name.toLowerCase();
                                      const isDropoff = targetLocation?.toLowerCase().includes(st.name.toLowerCase()) ||
                                        st.name.toLowerCase().includes(targetLocation?.toLowerCase() || '') ||
                                        resolvedNearestStop?.name.toLowerCase() === st.name.toLowerCase();

                                      let badgeIcon = '🚏';
                                      let btnBg = 'var(--apple-surface-subtle)';
                                      let btnBorder = '1px solid var(--apple-border-subtle)';
                                      let btnColor = 'var(--apple-label-primary)';
                                      let btnShadow = 'none';

                                      if (isDropoff) {
                                        badgeIcon = '▼';
                                        btnBg = colorInfo.bg;
                                        btnBorder = `1.5px solid ${colorInfo.bg}`;
                                        btnColor = colorInfo.text;
                                        btnShadow = `0 0 10px ${colorInfo.bg}66`;
                                      } else if (isBoarding) {
                                        badgeIcon = '▲';
                                        btnBg = 'rgba(48, 209, 88, 0.25)';
                                        btnBorder = '1.5px solid #30D158';
                                        btnColor = '#30D158';
                                        btnShadow = '0 0 10px rgba(48, 209, 88, 0.35)';
                                      }

                                      return (
                                        <button
                                          key={st.name}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setTargetLocation(st.name);
                                            if (st.campus) setDestCampus(st.campus);
                                            setMobileTab('map');
                                          }}
                                          title={isBoarding ? `${st.name} (▲ Boarding Stop near you)` : isDropoff ? `${st.name} (▼ Selected Drop-off Stop)` : `Tap to set destination to ${st.name}`}
                                          className="apple-btn-secondary"
                                          style={{
                                            padding: '3px 7px',
                                            fontSize: '10.5px',
                                            borderRadius: '7px',
                                            background: btnBg,
                                            color: btnColor,
                                            border: btnBorder,
                                            fontWeight: (isBoarding || isDropoff) ? 800 : 500,
                                            boxShadow: btnShadow,
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '4px'
                                          }}
                                        >
                                          <span>{badgeIcon}</span>
                                          <span>{getStopShortCode(st.name)}</span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {/* Dropdown for More Transit Options */}
                        {hasMoreRoutes && (
                          <div style={{ marginTop: '2px' }}>
                            <button
                              onClick={() => setShowAllRoutes(prev => !prev)}
                              className="apple-btn-secondary"
                              style={{
                                width: '100%',
                                padding: '8px 12px',
                                borderRadius: '11px',
                                fontSize: '11.5px',
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                background: 'var(--apple-surface-card)',
                                border: '1px solid var(--apple-border-subtle)',
                                cursor: 'pointer',
                                transition: 'all 0.18s ease'
                              }}
                            >
                              <span style={{ color: 'var(--apple-label-primary)' }}>
                                {showAllRoutes ? 'Show Fewer Options' : `More Transit Options (${remainingCount} more)`}
                              </span>
                              <ChevronDown
                                size={13}
                                color="var(--apple-label-secondary)"
                                style={{
                                  transform: showAllRoutes ? 'rotate(180deg)' : 'none',
                                  transition: 'transform 0.22s ease'
                                }}
                              />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>

        {/* Right Canvas: Replaced with Interactive Transit Map with Navigation */}
        <div className={`apple-canvas-area ${mobileTab === 'map' ? 'mobile-active' : ''}`}>
          <TransitMap
            appTheme={theme}
            buses={buses}
            originCampus={originCampus}
            destCampus={destCampus}
            currentLocation={currentLocation}
            targetLocation={targetLocation}
            userLocation={resolvedGeo ? resolvedGeo.coords : null}
            zoomToLocationTrigger={locationZoomTrigger}
            onSelectTargetLocation={(loc) => {
              setTargetLocation(loc);
              const resolved = resolveLocationCoords(loc, destCampus);
              if (resolved && resolved.campus && resolved.campus !== destCampus) {
                setDestCampus(resolved.campus);
              }
            }}
            selectedRoute={selectedRoute}
            onSelectCampus={(c) => {
              setDestCampus(c);
              if (c === "College Ave") setTargetLocation("College Ave Student Center");
              else if (c === "Busch") setTargetLocation("Busch Student Center");
              else if (c === "Livingston") setTargetLocation("Livingston Student Center");
              else if (c === "Cook") setTargetLocation("College Hall");
              handleCalculateRoute();
            }}
            onClearSelectedRoute={() => setSelectedRoute(null)}
            onSelectRoute={(rt) => setSelectedRoute(rt)}
            planResult={planResult}
            onSwitchToRoutes={() => setMobileTab('routes')}
            classes={classes}
            upcomingClassInfo={upcomingClassInfo}
            onAutoRouteToNextClass={() => handleGetToNextClass()}
          />
          <input
            ref={scheduleFileInputRef}
            type="file"
            accept="image/*,.ics,text/calendar"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />
        </div>
      </main>

      {/* Slide-Over Copilot Modal */}
      {showCopilotModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            width: '460px',
            maxWidth: '100%',
            height: '620px',
            maxHeight: '90vh',
            position: 'relative'
          }}>
            <button
              onClick={() => setShowCopilotModal(false)}
              className="apple-icon-btn"
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                zIndex: 10,
                width: '30px',
                height: '30px',
                background: 'var(--apple-surface-elevated)',
                border: '1px solid var(--apple-border)'
              }}
            >
              <X size={15} color="var(--apple-label-primary)" />
            </button>
            <AICopilotChat
              currentCampus={originCampus}
              currentLocation={currentLocation}
              userCoords={resolvedGeo ? [resolvedGeo.coords.lat, resolvedGeo.coords.lon] : undefined}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
