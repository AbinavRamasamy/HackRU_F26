import React, { useState, useEffect, useRef } from 'react';
import { Bus, Upload, Calendar, ArrowRight, Zap, MapPin, Code, Navigation, LocateFixed, ChevronDown, ChevronUp } from 'lucide-react';
import { TransitWidget } from './TransitWidget';
import { CampusRadar } from './CampusRadar';
import { AICopilotChat } from './AICopilotChat';
import { requestBrowserLocation, type ResolvedLocation } from './geolocation';

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
  const [expandedRoutes, setExpandedRoutes] = useState<boolean>(false);
  const [plannerMinimized, setPlannerMinimized] = useState<boolean>(false);

  const [originCampus, setOriginCampus] = useState("Busch");
  const [destCampus, setDestCampus] = useState("Livingston");
  const [currentLocation, setCurrentLocation] = useState("Busch Student Center");
  const [geoStatus, setGeoStatus] = useState<"idle" | "requesting" | "granted" | "denied">("idle");
  const [resolvedGeo, setResolvedGeo] = useState<ResolvedLocation | null>(null);
  const [planResult, setPlanResult] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [showWidgetOverlay, setShowWidgetOverlay] = useState(false);
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
          alert("Location permission was not granted or is unavailable in your browser. You can select your campus location manually from the dropdown.");
        }
      }
    );
  };

  useEffect(() => {
    // Automatically request location permission on page load
    requestLocationPermission(false);
  }, []);

  useEffect(() => {
    const fetchBuses = async () => {
      try {
        const res = await fetch("http://localhost:8000/api/telemetry");
        if (res.ok) {
          const data = await res.json();
          setBuses(data.buses || []);
        }
      } catch {
        // Fallback
        setBuses([
          { id: "bus-101", route: "LX", destination: "Livingston", lat: 40.5050, lon: -74.4500, speed_mph: 22, occupancy: "Standing Room Only", eta_mins: 3, next_stop: "The Yard" },
          { id: "bus-102", route: "LX", destination: "College Ave", lat: 40.5220, lon: -74.4360, speed_mph: 18, occupancy: "Seats Available", eta_mins: 7, next_stop: "Livingston Plaza" },
          { id: "bus-201", route: "B", destination: "Busch", lat: 40.5245, lon: -74.4420, speed_mph: 26, occupancy: "Seats Available", eta_mins: 4, next_stop: "Hill Center" },
          { id: "bus-301", route: "A", destination: "Busch", lat: 40.5100, lon: -74.4550, speed_mph: 15, occupancy: "Many Seats Available", eta_mins: 5, next_stop: "Busch Student Center" },
          { id: "bus-401", route: "F", destination: "Cook/Douglass", lat: 40.4950, lon: -74.4440, speed_mph: 12, occupancy: "Full", eta_mins: 8, next_stop: "College Hall" }
        ]);
      }
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
      }
    } catch {
      // Fallback calculation
      setPlanResult({
        origin: originCampus,
        destination: destCampus,
        routes: [
          {
            name: originCampus === "Busch" && destCampus === "Livingston" ? "Route B (Direct)" : "Route LX (Express)",
            type: "Direct Bus",
            estimated_minutes: originCampus === "Busch" && destCampus === "Livingston" ? 7 : 10,
            rush_hour_minutes: originCampus === "Busch" && destCampus === "Livingston" ? 12 : 18,
            badge: "Fastest Direct",
            description: `Board the ${originCampus === "Busch" && destCampus === "Livingston" ? "Route B" : "Route LX"} express line directly to your destination.`
          },
          {
            name: "Rutgers E-Scooter / Bike",
            type: "Bike / E-Scooter",
            estimated_minutes: 12,
            rush_hour_minutes: 14,
            badge: "Active Commute",
            description: "Paved bike trail connecting campuses, bypassing highway bottleneck."
          },
          {
            name: "Transfer via College Ave",
            type: "Transfer Route",
            estimated_minutes: 24,
            rush_hour_minutes: 32,
            badge: "Transfer Connection",
            description: "Connecting transit loop through Scott Hall / The Yard."
          }
        ],
        primary_route: originCampus === "Busch" && destCampus === "Livingston" ? "Route B" : "Route LX",
        base_minutes: 7,
        rush_hour_minutes: 14,
        advice: `Board the ${originCampus === "Busch" && destCampus === "Livingston" ? "B" : "LX"} bus. Allow ~14 mins during peak transitions.`
      });
    }
  };

  const handleGetToNextClass = async () => {
    if (classes.length === 0) {
      alert("No course schedule loaded yet! Please upload a screenshot of your WebReg, Canvas, or CSP schedule first.");
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

    // Filter classes meeting today
    const todayClasses = classes.filter(cls => {
      const days = Array.isArray(cls.days) ? cls.days : [cls.days];
      return days.includes(currentDayCode);
    });

    todayClasses.sort((a, b) => parseTimeToMins(a.startTime) - parseTimeToMins(b.startTime));

    // Find upcoming class today or first class overall
    let nextClass = todayClasses.find(cls => parseTimeToMins(cls.startTime) >= currentMins);
    if (!nextClass) {
      nextClass = todayClasses.length > 0 ? todayClasses[0] : classes[0];
    }

    const targetCampus = nextClass.campus || "College Ave";

    // Set origin based on live GPS location if available, otherwise current selection
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
          target_arrival_time: nextClass.startTime || "12:00"
        })
      });
      if (res.ok) {
        const data = await res.json();
        setPlanResult(data);
      }
    } catch {
      const isSame = currentOrigin === targetCampus;
      setPlanResult({
        origin: currentOrigin,
        destination: targetCampus,
        routes: [
          {
            name: isSame ? "Campus Pedestrian Walk" : "Direct Campus Express",
            type: isSame ? "Walking Path" : "Direct Bus",
            estimated_minutes: isSame ? 5 : 12,
            rush_hour_minutes: isSame ? 7 : 18,
            badge: "Fastest Direct",
            description: isSame ? `Direct pedestrian walk to ${nextClass.building}.` : `Board express line directly to ${targetCampus}.`
          },
          {
            name: "Rutgers E-Scooter / Bike",
            type: "Bike / E-Scooter",
            estimated_minutes: isSame ? 3 : 15,
            rush_hour_minutes: isSame ? 4 : 16,
            badge: "Active Commute",
            description: "Bike or e-scooter across dedicated campus trails."
          }
        ],
        primary_route: isSame ? "Walk / Campus Loop" : "LX",
        base_minutes: isSame ? 5 : 12,
        rush_hour_minutes: isSame ? 8 : 22,
        advice: `Heading to ${nextClass.course} at ${nextClass.startTime} on ${targetCampus}.`
      });
    }

    // Scroll to commute planner section
    const plannerEl = document.getElementById("commute-planner-section");
    if (plannerEl) {
      plannerEl.scrollIntoView({ behavior: "smooth" });
    }
  };

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
      // Reset input value so user can re-upload same file if needed
      e.target.value = "";
    }
  };

  return (
    <div style={{
      width: '100%',
      margin: 0,
      padding: '16px 28px 20px',
      minHeight: '100vh',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      flex: 1
    }}>
      {/* Top Navbar */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '14px',
        position: 'relative'
      }}>
        {/* 1. Logo (Top Left) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1 1 0', justifyContent: 'flex-start' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #cc0033 0%, #800020 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(204, 0, 51, 0.35)'
          }}>
            <Bus size={20} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '-0.5px', color: '#fff', margin: 0 }}>
              Scarlet<span style={{ color: '#ff3366' }}>Hop</span>
            </h1>
            <p style={{ fontSize: '11px', color: '#9ca3af', margin: 0 }}>Predictive Rutgers Transit Copilot</p>
          </div>
        </div>

        {/* 2. Transit Widget (Top Middle) */}
        <div style={{ display: 'flex', justifyContent: 'center', flex: '0 0 auto', position: 'relative' }}>
          <button
            ref={widgetTriggerRef}
            onClick={() => setShowWidgetOverlay(prev => !prev)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              padding: '6px 16px',
              borderRadius: '20px',
              background: showWidgetOverlay ? 'rgba(255, 255, 255, 0.18)' : 'rgba(255, 255, 255, 0.05)',
              border: showWidgetOverlay ? '1px solid rgba(255, 255, 255, 0.35)' : '1px solid rgba(255, 255, 255, 0.12)',
              color: '#f3f4f6',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: showWidgetOverlay ? '0 0 14px rgba(255, 255, 255, 0.12)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            <Code size={13} color="#ff4d6d" />
            Transit Widget
          </button>

          <TransitWidget
            isOpen={showWidgetOverlay}
            onClose={() => setShowWidgetOverlay(false)}
            triggerRef={widgetTriggerRef}
            currentCampus={currentLocation}
            nextClass={classes[0]}
          />
        </div>

        {/* 3. transitstat.us indicator (Top Right) */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', flex: '1 1 0' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11px',
              padding: '6px 12px',
              borderRadius: '16px',
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: '#34d399',
              fontWeight: 600
            }}
          >
            <span style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: '#34d399',
              boxShadow: '0 0 6px #34d399'
            }} />
            Transitstat.us (TripShot Live)
          </div>
        </div>
      </header>

      {/* Main Dashboard Overhauled Grid */}
      <div className="main-dashboard-grid" style={{ marginBottom: '16px' }}>
        {/* Left Column: Schedule as base layer + Commute Planner overlayed */}
        <div className="grid-col-left" style={{ display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 40 }}>
          {/* Card 1: Course Schedule (Previous Look - Base Layer underneath Planner) */}
          <div
            className="glass-panel"
            style={{
              padding: '16px 18px',
              maxHeight: classes.length > 0 ? 'clamp(360px, calc(100vh - 330px), 560px)' : undefined,
              minHeight: classes.length > 0 ? '360px' : undefined,
              overflowY: classes.length > 0 ? 'auto' : undefined,
              paddingBottom: classes.length > 0 ? (plannerMinimized ? '55px' : '230px') : '16px',
              position: 'relative',
              zIndex: 1
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={18} color="#ff3366" />
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#fff', margin: 0 }}>Your Schedule</h3>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <button
                  onClick={handleGetToNextClass}
                  title="Calculate best transit route to your next upcoming class"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '5px 10px',
                    borderRadius: '6px',
                    background: 'linear-gradient(135deg, #cc0033 0%, #800020 100%)',
                    border: '1px solid rgba(255, 51, 102, 0.4)',
                    color: '#fff',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(204, 0, 51, 0.3)'
                  }}
                >
                  <Navigation size={12} color="#fff" />
                  Get to Next Class
                </button>

                <label style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '5px 10px',
                  borderRadius: '6px',
                  background: 'rgba(204, 0, 51, 0.15)',
                  border: '1px solid rgba(204, 0, 51, 0.4)',
                  color: '#ff4d6d',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}>
                  <Upload size={12} />
                  {uploading ? "Importing..." : "Upload (.ics / Image)"}
                  <input type="file" accept="image/*,.ics,text/calendar" onChange={handleFileUpload} style={{ display: 'none' }} />
                </label>
              </div>
            </div>

            {classes.length === 0 ? (
              <div style={{
                padding: '12px 14px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px dashed rgba(255, 255, 255, 0.12)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'rgba(204, 0, 51, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Calendar size={16} color="#ff3366" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#fff' }}>No Schedule Loaded</div>
                  <div style={{ fontSize: '11px', color: '#9ca3af', lineHeight: 1.3 }}>
                    Upload an <strong>.ics calendar</strong> or <strong>screenshot</strong> to auto-route between classes.
                  </div>
                </div>
              </div>
            ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Day Filter Pills */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', paddingBottom: '4px' }}>
                <span style={{ fontSize: '11px', color: '#9ca3af', marginRight: '4px' }}>Filter Day:</span>
                {["ALL", "M", "T", "W", "TH", "F"].map((day) => (
                  <button
                    key={day}
                    onClick={() => setSelectedDayFilter(day)}
                    style={{
                      padding: '3px 9px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: selectedDayFilter === day ? '1px solid #ff3366' : '1px solid rgba(255, 255, 255, 0.1)',
                      background: selectedDayFilter === day ? 'rgba(204, 0, 51, 0.3)' : 'rgba(255, 255, 255, 0.03)',
                      color: selectedDayFilter === day ? '#fff' : '#9ca3af',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {day === "ALL" ? "All Week" : day}
                  </button>
                ))}
              </div>

              {classes
                .filter(cls => {
                  if (selectedDayFilter === "ALL") return true;
                  const days = Array.isArray(cls.days) ? cls.days : [cls.days];
                  return days.includes(selectedDayFilter);
                })
                .map((cls, idx) => (
                  <div key={idx} style={{
                    padding: '14px 16px',
                    borderRadius: '12px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '12px'
                  }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {cls.course}
                      </div>
                      <div style={{ fontSize: '12px', color: '#d1d5db', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <MapPin size={13} color="#ef4444" style={{ flexShrink: 0 }} />
                        <span>
                          <strong style={{ color: '#fff' }}>Location:</strong> {cls.location || cls.building || "Campus Classroom"}
                        </span>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: 800, color: '#38bdf8' }}>
                        {cls.startTime} - {cls.endTime}
                      </div>
                      <div style={{ marginTop: '4px', display: 'flex', justifyContent: 'flex-end' }}>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: '5px',
                          background: 'rgba(204, 0, 51, 0.2)',
                          border: '1px solid rgba(204, 0, 51, 0.45)',
                          color: '#ff4d6d',
                          letterSpacing: '0.5px'
                        }}>
                          {cls.days_display || (Array.isArray(cls.days) ? cls.days.join(", ") : cls.days)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Card 2: Inter-Campus Transit Routing - OVERLAYED ON TOP of the schedule */}
        <div
          id="commute-planner-section"
          className="glass-panel"
          style={{
            position: classes.length > 0 ? 'absolute' : 'relative',
            bottom: classes.length > 0 ? 0 : undefined,
            left: classes.length > 0 ? 0 : undefined,
            right: classes.length > 0 ? 0 : undefined,
            zIndex: 50,
            marginTop: classes.length > 0 ? 0 : '14px',
            padding: '14px 16px',
            background: classes.length > 0 ? 'rgba(16, 20, 31, 0.96)' : undefined,
            backdropFilter: classes.length > 0 ? 'blur(24px)' : undefined,
            WebkitBackdropFilter: classes.length > 0 ? 'blur(24px)' : undefined,
            border: classes.length > 0 ? '1px solid rgba(255, 255, 255, 0.14)' : undefined,
            boxShadow: classes.length > 0 ? '0 -8px 32px rgba(0, 0, 0, 0.8), 0 0 20px rgba(204, 0, 51, 0.18)' : undefined,
            borderRadius: '16px',
            transition: 'all 0.25s ease'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: plannerMinimized ? 0 : '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Zap size={17} color="#ff3366" />
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#fff', margin: 0 }}>Inter-Campus Commute Planner</h3>
            </div>
            {classes.length > 0 && (
              <button
                onClick={() => setPlannerMinimized(prev => !prev)}
                title={plannerMinimized ? "Expand Commute Planner" : "Minimize to reveal schedule underneath"}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#e5e7eb',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                {plannerMinimized ? <>Expand <ChevronUp size={12} /></> : <>Minimize <ChevronDown size={12} /></>}
              </button>
            )}
          </div>

          {!plannerMinimized && (
            <>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <label style={{ fontSize: '11px', color: '#9ca3af' }}>Origin Campus</label>
                {geoStatus === "granted" ? (
                  <span style={{ fontSize: '10px', color: '#10b981', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                    Live GPS ({resolvedGeo?.distanceMiles})
                  </span>
                ) : (
                  <button
                    onClick={() => requestLocationPermission(true)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#ff4d6d',
                      fontSize: '10px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px',
                      padding: 0
                    }}
                  >
                    <LocateFixed size={10} /> Use My Location
                  </button>
                )}
              </div>
              <select
                value={originCampus}
                onChange={(e) => setOriginCampus(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  borderRadius: '6px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#fff',
                  fontSize: '13px',
                  outline: 'none'
                }}
              >
                <option value="Busch" style={{ background: '#161922' }}>Busch</option>
                <option value="Livingston" style={{ background: '#161922' }}>Livingston</option>
                <option value="College Ave" style={{ background: '#161922' }}>College Ave</option>
                <option value="Cook" style={{ background: '#161922' }}>Cook / Douglass</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '11px', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>Destination Campus</label>
              <select
                value={destCampus}
                onChange={(e) => setDestCampus(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  borderRadius: '6px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#fff',
                  fontSize: '13px',
                  outline: 'none'
                }}
              >
                <option value="Livingston" style={{ background: '#161922' }}>Livingston</option>
                <option value="Busch" style={{ background: '#161922' }}>Busch</option>
                <option value="College Ave" style={{ background: '#161922' }}>College Ave</option>
                <option value="Cook" style={{ background: '#161922' }}>Cook / Douglass</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleCalculateRoute}
            style={{
              width: '100%',
              padding: '9px 12px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #cc0033 0%, #a00028 100%)',
              color: '#fff',
              fontWeight: 700,
              fontSize: '13px',
              boxShadow: '0 3px 12px rgba(204, 0, 51, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              marginBottom: '10px'
            }}
          >
            Compute Smart Route <ArrowRight size={14} />
          </button>

          {planResult && (() => {
            const routesList = (planResult.routes && planResult.routes.length > 0) ? planResult.routes : [
              {
                name: planResult.primary_route || planResult.recommended_routes?.[0] || "Direct Route",
                type: "Direct Bus",
                estimated_minutes: planResult.rush_hour_minutes || planResult.base_minutes || 15,
                badge: "Fastest",
                description: planResult.advice
              }
            ];
            const visibleRoutes = expandedRoutes ? routesList : routesList.slice(0, 1);

            return (
              <div style={{ marginTop: '10px' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '8px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Navigation size={13} color="#ff4d6d" />
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#f3f4f6', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Suggested Routes ({routesList.length})
                    </span>
                  </div>

                  {routesList.length > 1 && (
                    <button
                      onClick={() => setExpandedRoutes(prev => !prev)}
                      title={expandedRoutes ? "Minimize to 1 route" : `Expand all ${routesList.length} routes`}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        background: 'rgba(255, 255, 255, 0.06)',
                        border: '1px solid rgba(255, 255, 255, 0.14)',
                        color: '#f3f4f6',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {expandedRoutes ? (
                        <>Minimize <ChevronUp size={13} /></>
                      ) : (
                        <>+{routesList.length - 1} More <ChevronDown size={13} /></>
                      )}
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {visibleRoutes.map((route: any, idx: number) => {
                    const isTop = idx === 0;
                    const nameLower = (route.name || '').toLowerCase();
                    const typeLower = (route.type || '').toLowerCase();

                    const isWeekend = nameLower.includes('weekend');
                    const isBikeOrWalk = typeLower.includes('bike') || typeLower.includes('walk') || typeLower.includes('scooter');
                    const isTransfer = typeLower.includes('transfer');
                    const isShuttle = typeLower.includes('shuttle') || nameLower.includes('knight');

                    const badgeBg = isWeekend
                      ? '#0d9488'
                      : isBikeOrWalk
                        ? '#10b981'
                        : isTransfer
                          ? '#2563eb'
                          : isShuttle
                            ? '#7c3aed'
                            : '#cc0033';

                    return (
                      <div
                        key={idx}
                        style={{
                          padding: '10px 12px',
                          borderRadius: '10px',
                          background: isTop ? 'rgba(204, 0, 51, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                          border: isTop ? '1px solid rgba(204, 0, 51, 0.45)' : '1px solid rgba(255, 255, 255, 0.08)',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <span style={{
                              fontSize: '10px',
                              fontWeight: 800,
                              color: isTop ? '#ff4d6d' : '#9ca3af',
                              minWidth: '18px'
                            }}>
                              #{idx + 1}
                            </span>

                            <span style={{
                              fontSize: '12px',
                              fontWeight: 800,
                              color: '#fff',
                              padding: '2px 7px',
                              borderRadius: '5px',
                              background: badgeBg
                            }}>
                              {route.name}
                            </span>

                            {route.badge && (
                              <span style={{
                                fontSize: '9px',
                                fontWeight: 700,
                                padding: '2px 5px',
                                borderRadius: '4px',
                                background: isTop ? 'rgba(255, 77, 109, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                                color: isTop ? '#ff4d6d' : '#d1d5db'
                              }}>
                                {route.badge}
                              </span>
                            )}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{
                              fontSize: '12px',
                              fontWeight: 800,
                              color: isTop ? '#ff4d6d' : '#e5e7eb'
                            }}>
                              ~{route.estimated_minutes} mins
                            </span>
                            {route.rush_hour_minutes && route.rush_hour_minutes !== route.estimated_minutes && (
                              <span style={{ fontSize: '9px', color: '#9ca3af' }}>
                                (peak ~{route.rush_hour_minutes}m)
                              </span>
                            )}
                          </div>
                        </div>

                        <p style={{
                          fontSize: '11px',
                          color: '#d1d5db',
                          lineHeight: 1.4,
                          margin: '3px 0 0 24px'
                        }}>
                          {route.description || planResult.advice}
                        </p>
                      </div>
                    );
                  })}

                  {!expandedRoutes && routesList.length > 1 && (
                    <button
                      onClick={() => setExpandedRoutes(true)}
                      style={{
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px dashed rgba(255, 255, 255, 0.12)',
                        borderRadius: '6px',
                        color: '#38bdf8',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '5px',
                        padding: '5px 8px',
                        width: '100%',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <span>Show {routesList.length - 1} more option{routesList.length > 2 ? 's' : ''} ({routesList.slice(1).map((r: any) => r.name).join(', ')})</span>
                      <ChevronDown size={12} />
                    </button>
                  )}
                </div>
              </div>
            );
          })()}
          </>
          )}
        </div>
      </div>
      {/* End of Left Column (Schedule & Planner) */}

      {/* Right Column: 5. Ask ScarletHop Copilot in Right Side */}
      <div className="grid-col-right" style={{ position: 'sticky', top: '24px' }}>
        <AICopilotChat currentCampus={currentLocation} />
      </div>
    </div>
    {/* End of Upper 2-Column Dashboard Grid */}

    {/* 6. Rutgers Live Transit Radar: Bottom Floating HUD Overlay */}
    <div className="bottom-floating-radar-widget">
      <CampusRadar
        buses={buses}
        selectedCampus={originCampus}
        onSelectCampus={(c) => setOriginCampus(c)}
        isFloatingWidget={true}
      />
    </div>

    </div>
  );
}

export default App;
