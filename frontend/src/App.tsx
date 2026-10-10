import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Bus, Upload, Calendar, ArrowRight, MapPin, Code, Navigation, LocateFixed, ArrowDownUp, Sparkles, X, ChevronDown, Trash2 } from 'lucide-react';
import { TransitWidget } from './TransitWidget';
import { TransitMap } from './TransitMap';
import { AICopilotChat } from './AICopilotChat';
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

interface ClassItem {
  course: string;
  days: string[] | string;
  days_display?: string;
  startTime: string;
  endTime: string;
  building: string;
  location?: string;
  campus: string;
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

export function App() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
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
  const widgetTriggerRef = useRef<HTMLButtonElement>(null);
  const [buses, setBuses] = useState<any[]>([]);

  const requestLocationPermission = (isManual = false) => {
    setGeoStatus("requesting");
    requestBrowserLocation(
      (loc) => {
        setGeoStatus("granted");
        setResolvedGeo(loc);
        setCurrentLocation(loc.locationName);
        setOriginCampus(loc.campus);
      },
      (err) => {
        console.warn("Geolocation request failed or denied:", err);
        setGeoStatus("denied");
        if (isManual) {
          alert("Location permission was not granted or is unavailable in your browser. You can select your campus location manually.");
        }
      }
    );
  };

  useEffect(() => {
    requestLocationPermission(false);
  }, []);

  useEffect(() => {
    const fetchBuses = async () => {
      try {
        const res = await fetch("http://localhost:8000/api/telemetry");
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
      const res = await fetch("http://localhost:8000/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin_campus: originCampus,
          destination_campus: destCampus,
          target_arrival_time: "12:00"
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

    const isBuschCol = (originCampus === "Busch" && destCampus === "College Ave") || (originCampus === "College Ave" && destCampus === "Busch");
    const isBuschLiv = (originCampus === "Busch" && destCampus === "Livingston") || (originCampus === "Livingston" && destCampus === "Busch");

    const fallbackRoutes = [
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

    const fallbackPlan = {
      origin: originCampus,
      destination: destCampus,
      routes: fallbackRoutes,
      primary_route: fallbackRoutes[0].name,
      base_minutes: fallbackRoutes[0].estimated_minutes,
      advice: fallbackRoutes[0].description
    };

    setPlanResult(fallbackPlan);
    setSelectedRoute(fallbackRoutes[0]);
  };

  // Automatically calculate route on mount and when origin or destination changes
  useEffect(() => {
    handleCalculateRoute();
  }, [originCampus, destCampus]);

  const handleGetToNextClass = async (specificClass?: ClassItem) => {
    let targetClass = specificClass;
    if (!targetClass) {
      if (classes.length === 0) {
        alert("Please upload your course schedule first (.ics or screenshot).");
        return;
      }

      const now = new Date();
      const currentMins = now.getHours() * 60 + now.getMinutes();
      const daysArr = ["SU", "M", "T", "W", "TH", "F", "S"];
      const currentDayCode = daysArr[now.getDay()];

      const parseTimeToMins = (timeStr: string) => {
        if (!timeStr) return 0;
        const parts = timeStr.split(":");
        return parseInt(parts[0], 10) * 60 + parseInt(parts[1] || "0", 10);
      };

      const todayClasses = classes.filter(cls => {
        const days = Array.isArray(cls.days) ? cls.days : [cls.days];
        return days.includes(currentDayCode);
      });
      todayClasses.sort((a, b) => parseTimeToMins(a.startTime) - parseTimeToMins(b.startTime));

      targetClass = todayClasses.find(cls => parseTimeToMins(cls.startTime) >= currentMins) || (todayClasses.length > 0 ? todayClasses[0] : classes[0]);
    }

    const targetCampus = targetClass.campus || "College Ave";
    const targetBuilding = targetClass.location || targetClass.building || targetCampus;
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

    try {
      const res = await fetch("http://localhost:8000/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin_campus: currentOrigin,
          destination_campus: targetCampus,
          target_arrival_time: targetClass.startTime || "12:00"
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
    const temp = originCampus;
    setOriginCampus(destCampus);
    setDestCampus(temp);
    if (temp === "College Ave") setTargetLocation("College Ave Student Center");
    else if (temp === "Busch") setTargetLocation("Busch Student Center");
    else if (temp === "Livingston") setTargetLocation("Livingston Student Center");
    else if (temp === "Cook") setTargetLocation("College Hall");
  };

  // Dynamically resolve target coordinates and find the nearest bus stop (ZERO HARDCODING)
  const resolvedDestCoords = useMemo(() => {
    return resolveLocationCoords(targetLocation || destCampus, destCampus);
  }, [targetLocation, destCampus]);

  const resolvedNearestStop = useMemo(() => {
    return findNearestBusStop(resolvedDestCoords, destCampus, selectedRoute?.name);
  }, [resolvedDestCoords, destCampus, selectedRoute?.name]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setUploading(true);
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("http://localhost:8000/api/schedule/upload", {
        method: "POST",
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        if (data.status === "missing_api_key") {
          alert("Notice: GEMINI_API_KEY is not set in your .env file.\n\nTo parse your custom WebReg screenshot, add GEMINI_API_KEY=your_key to your .env file and restart the backend.");
        } else if (data.status === "error") {
          alert("OCR Parsing Notice: " + (data.message || "Failed to parse image. Please ensure the image is clear."));
        }

        if (data.classes && data.classes.length > 0) {
          setClasses(sortClassesByDateAndTime(data.classes));
        }
      } else {
        alert("Server returned error during schedule upload. Please verify backend is running on port 8000.");
      }
    } catch (err) {
      console.error("Upload error:", err);
      alert("Could not connect to backend server at http://localhost:8000/api/schedule/upload.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleDeleteClass = (targetClass: ClassItem) => {
    setClasses(prev => prev.filter(c => c !== targetClass));
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
            background: 'linear-gradient(135deg, #FF375F 0%, #D71A43 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 10px rgba(255, 55, 95, 0.35)'
          }}>
            <Bus size={17} color="#fff" strokeWidth={2.2} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <h1 style={{ fontSize: '16px', fontWeight: 700, letterSpacing: '-0.025em', color: '#fff', margin: 0 }}>
                Scarlet<span style={{ color: '#FF375F' }}>Hop</span>
              </h1>
              <span style={{
                fontSize: '10px',
                fontWeight: 700,
                color: 'rgba(235, 235, 245, 0.55)',
                background: 'rgba(255, 255, 255, 0.08)',
                padding: '1px 5px',
                borderRadius: '4px'
              }}>
                MAPS
              </span>
            </div>
          </div>
        </div>

        {/* Center: Apple Dynamic Island / Live Activity Pill */}
        <div
          className="apple-dynamic-island"
          onClick={upcomingClass ? () => handleGetToNextClass() : undefined}
          style={{ cursor: upcomingClass ? 'pointer' : 'default' }}
          title={upcomingClass ? "Click to calculate transit to upcoming class" : undefined}
        >
          <span style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: '#30D158',
            boxShadow: '0 0 8px #30D158',
            flexShrink: 0
          }} />
          {upcomingClass ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Navigation size={12} color="#FF375F" />
              <span>Next: <strong>{upcomingClass.course}</strong> ({upcomingClass.campus}) • Tap to Route</span>
            </span>
          ) : selectedRoute ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Navigation size={12} color="#30D158" />
              <span>Navigating: <strong>{selectedRoute.name}</strong> • ~{selectedRoute.estimated_minutes}m to {destCampus}</span>
            </span>
          ) : (
            <span>TripShot Telemetry • {buses.length} Vehicles Tracked Live</span>
          )}
        </div>

        {/* Right: Clean Apple Controls Group */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Siri Copilot Drawer Trigger */}
          <button
            onClick={() => setShowCopilotModal(prev => !prev)}
            className="apple-btn-secondary"
            style={{ fontSize: '12px', padding: '5px 12px', gap: '6px' }}
            title="Ask ScarletHop Copilot"
          >
            <Sparkles size={13} color="#BF5AF2" />
            <span>Copilot</span>
          </button>

          {/* Location button */}
          <button
            onClick={() => requestLocationPermission(true)}
            className="apple-btn-secondary"
            style={{ fontSize: '12px', padding: '5px 12px', gap: '6px' }}
            title="Update your current campus location"
          >
            <LocateFixed size={12} color={geoStatus === "granted" ? "#30D158" : "rgba(235, 235, 245, 0.6)"} />
            <span>{geoStatus === "granted" ? `GPS: ${originCampus}` : "Location"}</span>
          </button>

          {/* Widget trigger */}
          <div style={{ position: 'relative' }}>
            <button
              ref={widgetTriggerRef}
              onClick={() => setShowWidgetOverlay(prev => !prev)}
              className="apple-btn-secondary"
              style={{ fontSize: '12px', padding: '5px 12px', gap: '6px' }}
            >
              <Code size={12} color="#FF375F" />
              <span>Widget</span>
            </button>

            <TransitWidget
              isOpen={showWidgetOverlay}
              onClose={() => setShowWidgetOverlay(false)}
              triggerRef={widgetTriggerRef}
              currentCampus={currentLocation}
              nextClass={upcomingClass || undefined}
            />
          </div>
        </div>
      </header>

      {/* 2. Apple Dual-Pane Workspace */}
      <main className="apple-main-workspace">
        {/* Left Sheet: Combined Directions & Schedule with Apple Ideology */}
        <div className="apple-sidebar-sheet">
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
                SECTION 1: DIRECTIONS & TRANSIT OPTIONS (TOP)
                ======================================================== */}
            <div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '10px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                  <Navigation size={15} color="#FF375F" />
                  <h2 style={{ fontSize: '14.5px', fontWeight: 700, color: '#fff', margin: 0, letterSpacing: '-0.015em' }}>
                    Directions
                  </h2>
                </div>
                {selectedRoute && (
                  <span style={{ fontSize: '10.5px', color: '#30D158', fontWeight: 600 }}>
                    ● Active on Map
                  </span>
                )}
              </div>

              {/* Next Class Smart Suggestion Chip (If schedule is loaded) */}
              {upcomingClass && (
                <div
                  onClick={() => handleGetToNextClass()}
                  style={{
                    padding: '9px 12px',
                    borderRadius: '12px',
                    background: 'rgba(255, 55, 95, 0.1)',
                    border: '1px solid rgba(255, 55, 95, 0.3)',
                    marginBottom: '10px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: '10.5px', color: '#FF375F', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                      Next Class
                    </div>
                    <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {upcomingClass.course} • {upcomingClass.startTime} ({upcomingClass.campus})
                    </div>
                  </div>
                  <div className="apple-btn-primary" style={{ padding: '4px 10px', fontSize: '11px', flexShrink: 0 }}>
                    Route <ArrowRight size={11} />
                  </div>
                </div>
              )}

              {/* Apple Maps Origin / Destination Form Card (Minimized by Default) */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.04)',
                borderRadius: '14px',
                padding: isRouteFormExpanded ? '12px' : '9px 12px',
                border: '1px solid rgba(255, 255, 255, 0.07)',
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
                      background: 'rgba(255, 55, 95, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <Navigation size={11} color="#FF375F" />
                    </div>

                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{
                        fontSize: '12px',
                        fontWeight: 650,
                        color: '#fff',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px'
                      }}>
                        <span style={{ color: '#fff' }}>{originCampus}</span>
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
                          To: {targetLocation} • Stop: {resolvedNearestStop.name}
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      color: isRouteFormExpanded ? '#FF375F' : 'var(--apple-label-secondary)',
                      padding: '2px 7px',
                      borderRadius: '6px',
                      background: 'rgba(255, 255, 255, 0.05)'
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
                    borderTop: '1px solid rgba(255, 255, 255, 0.07)',
                    animation: 'apple-fade-in 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                  }}>
                    {/* Origin */}
                    <div style={{ marginBottom: '8px' }}>
                      <label style={{ fontSize: '11px', color: 'var(--apple-label-secondary)', display: 'block', marginBottom: '3px' }}>
                        Departing From
                      </label>
                      <select
                        value={originCampus}
                        onChange={(e) => setOriginCampus(e.target.value)}
                        className="apple-select-box"
                      >
                        <option value="Busch" style={{ background: '#1c1c1e' }}>Busch Campus</option>
                        <option value="Livingston" style={{ background: '#1c1c1e' }}>Livingston Campus</option>
                        <option value="College Ave" style={{ background: '#1c1c1e' }}>College Ave Campus</option>
                        <option value="Cook" style={{ background: '#1c1c1e' }}>Cook / Douglass Campus</option>
                      </select>
                    </div>

                    {/* Swap Button */}
                    <div style={{ display: 'flex', justifyContent: 'center', margin: '-4px 0 4px' }}>
                      <button
                        onClick={handleSwapCampuses}
                        className="apple-icon-btn"
                        title="Swap origin and destination"
                        style={{ width: '26px', height: '26px' }}
                      >
                        <ArrowDownUp size={12} />
                      </button>
                    </div>

                    {/* Destination Campus */}
                    <div style={{ marginBottom: '8px' }}>
                      <label style={{ fontSize: '11px', color: 'var(--apple-label-secondary)', display: 'block', marginBottom: '3px' }}>
                        Going To Campus
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
                        <option value="College Ave" style={{ background: '#1c1c1e' }}>College Ave Campus</option>
                        <option value="Livingston" style={{ background: '#1c1c1e' }}>Livingston Campus</option>
                        <option value="Busch" style={{ background: '#1c1c1e' }}>Busch Campus</option>
                        <option value="Cook" style={{ background: '#1c1c1e' }}>Cook / Douglass Campus</option>
                      </select>
                    </div>

                    {/* Target Location / Building (Dynamic Nearest Stop Resolver) */}
                    <div style={{ marginBottom: '8px' }}>
                      <label style={{ fontSize: '11px', color: 'var(--apple-label-secondary)', display: 'block', marginBottom: '3px' }}>
                        Next Location / Building
                      </label>
                      <select
                        value={targetLocation}
                        onChange={(e) => setTargetLocation(e.target.value)}
                        className="apple-select-box"
                      >
                        {/* Primary Student Center / Hub */}
                        <option value={
                          destCampus === "College Ave" ? "College Ave Student Center" :
                            destCampus === "Busch" ? "Busch Student Center" :
                              destCampus === "Livingston" ? "Livingston Student Center" : "College Hall"
                        } style={{ background: '#1c1c1e' }}>
                          {destCampus === "College Ave" ? "College Ave Student Center (CASC)" :
                            destCampus === "Busch" ? "Busch Student Center (BSC)" :
                              destCampus === "Livingston" ? "Livingston Student Center (LSC)" : "College Hall"}
                        </option>

                        {/* All Campus Buildings */}
                        {RUTGERS_BUILDINGS.filter(b => matchCampus(b.campus, destCampus) && !b.name.includes("Student Center")).map(b => (
                          <option key={b.name} value={b.name} style={{ background: '#1c1c1e' }}>
                            {b.name} {b.code ? `(${b.code})` : ''}
                          </option>
                        ))}

                        {/* All Campus Bus Stops */}
                        {RUTGERS_BUS_STOPS.filter(s => matchCampus(s.campus, destCampus) && !s.name.includes("Student Center")).map(s => (
                          <option key={s.name} value={s.name} style={{ background: '#1c1c1e' }}>
                            Bus Stop: {s.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Dynamic Nearest Bus Stop Display (ZERO HARDCODING) */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '6px',
                      padding: '7px 10px',
                      background: 'rgba(255, 255, 255, 0.04)',
                      borderRadius: '9px',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      marginBottom: '10px',
                      fontSize: '11px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Bus size={12} color="#30D158" />
                        <span style={{ color: 'var(--apple-label-secondary)' }}>Nearest Bus Stop:</span>
                      </div>
                      <span style={{ fontWeight: 700, color: '#30D158' }}>
                        {resolvedNearestStop.name}
                      </span>
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
                            onClick={() => setSelectedRoute(route)}
                            style={{
                              padding: '11px 13px',
                              borderRadius: '13px',
                              background: isSelected
                                ? 'rgba(255, 255, 255, 0.08)'
                                : 'rgba(255, 255, 255, 0.03)',
                              border: isSelected
                                ? `1.5px solid ${colorInfo.bg}`
                                : '1px solid rgba(255, 255, 255, 0.07)',
                              cursor: 'pointer',
                              transition: 'all 0.18s ease',
                              boxShadow: isSelected ? `0 0 16px ${colorInfo.bg}44` : 'none'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '3px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
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
                                {isSelected ? (
                                  <span style={{ fontSize: '11px', color: '#30D158', fontWeight: 700 }}>
                                    ● Navigating
                                  </span>
                                ) : isTop ? (
                                  <span style={{ fontSize: '11px', color: '#30D158', fontWeight: 600 }}>
                                    ● Recommended
                                  </span>
                                ) : null}
                              </div>
                              <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>
                                ~{route.estimated_minutes} min
                              </div>
                            </div>
                            <p style={{ fontSize: '11px', color: 'var(--apple-label-secondary)', margin: '3px 0 0', lineHeight: 1.35 }}>
                              {route.description}
                            </p>

                            {/* Stop Selector Buttons for Selected Route */}
                            {isSelected && stops.length > 0 && (
                              <div style={{
                                marginTop: '9px',
                                paddingTop: '8px',
                                borderTop: '1px solid rgba(255, 255, 255, 0.08)'
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
                                  <span style={{ color: '#0A84FF', fontWeight: 600 }}>Tap to Route</span>
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                                  {stops.map((st) => {
                                    const isStopActive = targetLocation?.toLowerCase().includes(st.name.toLowerCase()) || 
                                                         st.name.toLowerCase().includes(targetLocation?.toLowerCase() || '');
                                    return (
                                      <button
                                        key={st.name}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setTargetLocation(st.name);
                                          if (st.campus) setDestCampus(st.campus);
                                        }}
                                        title={`${st.name} (${st.campus})`}
                                        className="apple-btn-secondary"
                                        style={{
                                          padding: '3px 7px',
                                          fontSize: '10.5px',
                                          borderRadius: '7px',
                                          background: isStopActive ? colorInfo.bg : 'rgba(255, 255, 255, 0.06)',
                                          color: isStopActive ? colorInfo.text : 'rgba(255, 255, 255, 0.9)',
                                          border: isStopActive ? `1.5px solid ${colorInfo.bg}` : '1px solid rgba(255, 255, 255, 0.1)',
                                          fontWeight: isStopActive ? 800 : 500,
                                          boxShadow: isStopActive ? `0 0 10px ${colorInfo.bg}66` : 'none',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '4px'
                                        }}
                                      >
                                        <span>{isStopActive ? '▼' : '🚏'}</span>
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
                              background: 'rgba(255, 255, 255, 0.05)',
                              border: '1px solid rgba(255, 255, 255, 0.08)',
                              cursor: 'pointer',
                              transition: 'all 0.18s ease'
                            }}
                          >
                            <span style={{ color: '#fff' }}>
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

            {/* Subtle Divider */}
            <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.08)', margin: '2px 0' }} />

            {/* ========================================================
                SECTION 2: COURSE SCHEDULE (BELOW DIRECTIONS)
                ======================================================== */}
            <div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '10px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                  <Calendar size={15} color="#FF375F" />
                  <h2 style={{ fontSize: '14.5px', fontWeight: 700, color: '#fff', margin: 0, letterSpacing: '-0.015em' }}>
                    Course Schedule
                  </h2>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {classes.length > 0 && (
                    <button
                      onClick={() => {
                        if (window.confirm("Clear all classes from your schedule?")) {
                          setClasses([]);
                        }
                      }}
                      className="apple-btn-secondary"
                      style={{ fontSize: '11px', padding: '4px 8px', color: '#FF453A' }}
                      title="Clear all imported classes"
                    >
                      Clear
                    </button>
                  )}
                  <label className="apple-btn-secondary" style={{ fontSize: '11px', padding: '4px 9px', cursor: 'pointer' }}>
                    <Upload size={11} />
                    {uploading ? "Importing..." : "Import"}
                    <input type="file" accept="image/*,.ics,text/calendar" onChange={handleFileUpload} style={{ display: 'none' }} />
                  </label>
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
                  padding: '16px',
                  borderRadius: '14px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px dashed rgba(255, 255, 255, 0.1)',
                  textAlign: 'center'
                }}>
                  <p style={{ fontSize: '11.5px', color: 'var(--apple-label-secondary)', lineHeight: 1.4, margin: '0 auto 10px', maxWidth: '240px' }}>
                    Upload an .ics schedule or WebReg screenshot to view classes and auto-navigate between them.
                  </p>
                  <label className="apple-btn-primary" style={{ fontSize: '11.5px', padding: '6px 12px', cursor: 'pointer' }}>
                    <Upload size={11} />
                    Choose File
                    <input type="file" accept="image/*,.ics,text/calendar" onChange={handleFileUpload} style={{ display: 'none' }} />
                  </label>
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
                          background: 'rgba(255, 255, 255, 0.03)',
                          border: '1px solid rgba(255, 255, 255, 0.06)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '8px'
                        }}
                      >
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {cls.course}
                          </div>
                          <div style={{ fontSize: '10.5px', color: 'var(--apple-label-secondary)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <MapPin size={10} color="#FF375F" />
                            <span>{cls.location || cls.building} ({cls.campus})</span>
                          </div>
                        </div>

                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontSize: '11px', fontWeight: 700, color: '#0A84FF', fontVariantNumeric: 'tabular-nums' }}>
                            {cls.startTime} - {cls.endTime}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '3px', justifyContent: 'flex-end' }}>
                            <button
                              onClick={() => handleGetToNextClass(cls)}
                              className="apple-btn-secondary"
                              style={{ padding: '3px 8px', fontSize: '10.5px' }}
                              title="Calculate transit & start map navigation to this class"
                            >
                              Route ➔
                            </button>
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
            </div>
          </div>
        </div>

        {/* Right Canvas: Replaced with Interactive Transit Map with Navigation */}
        <div className="apple-canvas-area">
          <TransitMap
            buses={buses}
            originCampus={originCampus}
            destCampus={destCampus}
            currentLocation={currentLocation}
            targetLocation={targetLocation}
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
                background: 'rgba(255, 255, 255, 0.15)'
              }}
            >
              <X size={15} color="#fff" />
            </button>
            <AICopilotChat currentCampus={currentLocation} />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
