import React, { useState, useEffect, useRef } from 'react';
import { Bus, Upload, Calendar, ArrowRight, MapPin, Code, Navigation, LocateFixed, ArrowDownUp, Sparkles } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState<'directions' | 'schedule' | 'copilot'>('directions');
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedDayFilter, setSelectedDayFilter] = useState<string>("ALL");

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
        { id: "bus-101", route: "LX", destination: "Livingston", campus: "College Ave", lat: 40.5050, lon: -74.4500, speed_mph: 22, occupancy: "Standing Room Only", eta_mins: 3, next_stop: "The Yard" },
        { id: "bus-102", route: "LX", destination: "College Ave", campus: "Livingston", lat: 40.5220, lon: -74.4360, speed_mph: 18, occupancy: "Seats Available", eta_mins: 7, next_stop: "Livingston Plaza" },
        { id: "bus-201", route: "B", destination: "Busch", campus: "Livingston", lat: 40.5245, lon: -74.4420, speed_mph: 26, occupancy: "Seats Available", eta_mins: 4, next_stop: "Hill Center" },
        { id: "bus-301", route: "A", destination: "Busch", campus: "College Ave", lat: 40.5100, lon: -74.4550, speed_mph: 15, occupancy: "Many Seats Available", eta_mins: 5, next_stop: "Busch Student Center" },
        { id: "bus-302", route: "H", destination: "Busch", campus: "College Ave", lat: 40.5030, lon: -74.4480, speed_mph: 19, occupancy: "Seats Available", eta_mins: 6, next_stop: "Stadium West Lot" },
        { id: "bus-401", route: "F", destination: "Cook/Douglass", campus: "College Ave", lat: 40.4950, lon: -74.4440, speed_mph: 12, occupancy: "Full", eta_mins: 8, next_stop: "College Hall" },
        { id: "bus-402", route: "EE", destination: "Cook/Douglass", campus: "College Ave", lat: 40.4920, lon: -74.4420, speed_mph: 14, occupancy: "Seats Available", eta_mins: 5, next_stop: "George St & Paterson" },
        { id: "bus-501", route: "REXB", destination: "Cook/Douglass", campus: "Busch", lat: 40.5180, lon: -74.4600, speed_mph: 32, occupancy: "Seats Available", eta_mins: 9, next_stop: "Red Oak Lane" },
        { id: "bus-502", route: "REXL", destination: "Cook/Douglass", campus: "Livingston", lat: 40.5210, lon: -74.4350, speed_mph: 30, occupancy: "Seats Available", eta_mins: 11, next_stop: "Lipman Hall" }
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
      }
    } catch {
      const isBuschLiv = (originCampus === "Busch" && destCampus === "Livingston") || (originCampus === "Livingston" && destCampus === "Busch");
      setPlanResult({
        origin: originCampus,
        destination: destCampus,
        routes: [
          {
            name: isBuschLiv ? "Route B (Direct)" : "Route LX (Express)",
            type: "Direct Bus",
            estimated_minutes: isBuschLiv ? 7 : 10,
            rush_hour_minutes: isBuschLiv ? 12 : 18,
            badge: "Fastest Direct",
            description: `Board the ${isBuschLiv ? "Route B" : "Route LX"} express line directly to your destination.`
          },
          {
            name: "Rutgers E-Scooter / Bike",
            type: "Bike / E-Scooter",
            estimated_minutes: 12,
            rush_hour_minutes: 14,
            description: "Dedicated paved trail connecting campuses, bypassing highway bottleneck."
          },
          {
            name: "Transfer via College Ave",
            type: "Transfer Route",
            estimated_minutes: 24,
            rush_hour_minutes: 32,
            description: "Connecting transit loop through Scott Hall / The Yard."
          }
        ],
        primary_route: isBuschLiv ? "Route B" : "Route LX",
        base_minutes: isBuschLiv ? 7 : 10,
        rush_hour_minutes: isBuschLiv ? 12 : 18,
        advice: `Board the ${isBuschLiv ? "B" : "LX"} bus. Allow ~14 mins during peak transitions.`
      });
    }
  };

  const handleGetToNextClass = async (specificClass?: ClassItem) => {
    let targetClass = specificClass;
    if (!targetClass) {
      if (classes.length === 0) {
        setActiveTab('schedule');
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

    let currentOrigin = originCampus;
    if (resolvedGeo) {
      currentOrigin = resolvedGeo.campus;
    } else if (currentLocation.includes("Busch")) currentOrigin = "Busch";
    else if (currentLocation.includes("Livingston")) currentOrigin = "Livingston";
    else if (currentLocation.includes("College")) currentOrigin = "College Ave";
    else if (currentLocation.includes("Cook") || currentLocation.includes("Douglass")) currentOrigin = "Cook";

    setOriginCampus(currentOrigin);
    setDestCampus(targetCampus);
    setActiveTab('directions');

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
            description: isSame ? `Direct pedestrian walk to ${targetClass.building}.` : `Board express line directly to ${targetCampus}.`
          },
          {
            name: "Rutgers E-Scooter / Bike",
            type: "Bike / E-Scooter",
            estimated_minutes: isSame ? 3 : 15,
            rush_hour_minutes: isSame ? 4 : 16,
            description: "Bike or e-scooter across dedicated campus trails."
          }
        ],
        primary_route: isSame ? "Walk" : "LX",
        base_minutes: isSame ? 5 : 12,
        rush_hour_minutes: isSame ? 8 : 22,
        advice: `Heading to ${targetClass.course} at ${targetClass.startTime} on ${targetCampus}.`
      });
    }
  };

  const handleSwapCampuses = () => {
    const temp = originCampus;
    setOriginCampus(destCampus);
    setDestCampus(temp);
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
          setActiveTab('schedule');
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
                TRANSIT
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
              <span>Next: <strong>{upcomingClass.course}</strong> ({upcomingClass.campus}) • Tap for Route</span>
            </span>
          ) : (
            <span>TripShot Telemetry • {buses.length} Vehicles Tracked</span>
          )}
        </div>

        {/* Right: Clean Apple Controls Group */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => requestLocationPermission(true)}
            className="apple-btn-secondary"
            style={{ fontSize: '12px', padding: '5px 12px', gap: '6px' }}
            title="Update your current campus location"
          >
            <LocateFixed size={12} color={geoStatus === "granted" ? "#30D158" : "rgba(235, 235, 245, 0.6)"} />
            <span>{geoStatus === "granted" ? `GPS: ${originCampus}` : "Location"}</span>
          </button>

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
        {/* Left Sheet: Floating Apple Glass Panel */}
        <div className="apple-sidebar-sheet">
          <div className="apple-panel" style={{
            padding: '16px',
            height: '100%',
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            boxSizing: 'border-box'
          }}>
            {/* Apple Segmented View Switcher (Ruthless Button Consolidation) */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '14px', flexShrink: 0 }}>
              <div className="apple-segmented-control" style={{ width: '100%', justifyContent: 'space-between' }}>
                <button
                  className={`apple-segment-btn ${activeTab === 'directions' ? 'active' : ''}`}
                  onClick={() => setActiveTab('directions')}
                  style={{ flex: 1 }}
                >
                  <Navigation size={13} />
                  Directions
                </button>
                <button
                  className={`apple-segment-btn ${activeTab === 'schedule' ? 'active' : ''}`}
                  onClick={() => setActiveTab('schedule')}
                  style={{ flex: 1 }}
                >
                  <Calendar size={13} />
                  Schedule
                  {classes.length > 0 && (
                    <span style={{
                      fontSize: '10px',
                      padding: '1px 5px',
                      borderRadius: '9999px',
                      background: activeTab === 'schedule' ? '#FF375F' : 'rgba(255,255,255,0.18)',
                      color: '#fff'
                    }}>
                      {classes.length}
                    </span>
                  )}
                </button>
                <button
                  className={`apple-segment-btn ${activeTab === 'copilot' ? 'active' : ''}`}
                  onClick={() => setActiveTab('copilot')}
                  style={{ flex: 1 }}
                >
                  <Sparkles size={13} />
                  Copilot
                </button>
              </div>
            </div>

            {/* TAB 1: DIRECTIONS (Apple Maps Transit Routing) */}
            {activeTab === 'directions' && (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                minHeight: 0,
                overflowY: 'auto',
                paddingRight: '2px'
              }}>
                {/* Next Class Smart Suggestion Chip (If schedule is loaded) */}
                {upcomingClass && (
                  <div
                    onClick={() => handleGetToNextClass()}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '12px',
                      background: 'rgba(255, 55, 95, 0.12)',
                      border: '1px solid rgba(255, 55, 95, 0.35)',
                      marginBottom: '14px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '11px', color: '#FF375F', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                        Upcoming Class
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff', marginTop: '1px' }}>
                        {upcomingClass.course} • {upcomingClass.startTime}
                      </div>
                      <div style={{ fontSize: '11.5px', color: 'var(--apple-label-secondary)' }}>
                        {upcomingClass.building} ({upcomingClass.campus})
                      </div>
                    </div>
                    <div className="apple-btn-primary" style={{ padding: '6px 12px', fontSize: '11.5px' }}>
                      Route <ArrowRight size={12} />
                    </div>
                  </div>
                )}

                {/* Apple Maps Origin / Destination Form Card */}
                <div style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  borderRadius: '16px',
                  padding: '14px',
                  border: '1px solid rgba(255, 255, 255, 0.07)',
                  marginBottom: '14px'
                }}>
                  {/* Origin */}
                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ fontSize: '11px', color: 'var(--apple-label-secondary)', display: 'block', marginBottom: '4px' }}>
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

                  {/* Swap Button (Clean Apple circular icon button) */}
                  <div style={{ display: 'flex', justifyContent: 'center', margin: '-4px 0 6px' }}>
                    <button
                      onClick={handleSwapCampuses}
                      className="apple-icon-btn"
                      title="Swap origin and destination"
                      style={{ width: '28px', height: '28px' }}
                    >
                      <ArrowDownUp size={13} />
                    </button>
                  </div>

                  {/* Destination */}
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ fontSize: '11px', color: 'var(--apple-label-secondary)', display: 'block', marginBottom: '4px' }}>
                      Going To
                    </label>
                    <select
                      value={destCampus}
                      onChange={(e) => setDestCampus(e.target.value)}
                      className="apple-select-box"
                    >
                      <option value="Livingston" style={{ background: '#1c1c1e' }}>Livingston Campus</option>
                      <option value="Busch" style={{ background: '#1c1c1e' }}>Busch Campus</option>
                      <option value="College Ave" style={{ background: '#1c1c1e' }}>College Ave Campus</option>
                      <option value="Cook" style={{ background: '#1c1c1e' }}>Cook / Douglass Campus</option>
                    </select>
                  </div>

                  {/* Primary Compute Route Button */}
                  <button
                    onClick={handleCalculateRoute}
                    className="apple-btn-primary"
                    style={{ width: '100%', padding: '9px 14px', borderRadius: '12px', fontSize: '13px' }}
                  >
                    Find Transit Routes <ArrowRight size={14} />
                  </button>
                </div>

                {/* Apple Maps Suggested Transit Routes */}
                {planResult && (
                  <div>
                    <div style={{
                      fontSize: '11.5px',
                      fontWeight: 600,
                      color: 'var(--apple-label-secondary)',
                      marginBottom: '8px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.4px'
                    }}>
                      Transit Options ({planResult.origin} ➔ {planResult.destination})
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {((planResult.routes && planResult.routes.length > 0) ? planResult.routes : [
                        {
                          name: planResult.primary_route || "Direct Transit",
                          type: "Bus",
                          estimated_minutes: planResult.base_minutes || 10,
                          badge: "Fastest",
                          description: planResult.advice
                        }
                      ]).map((route: any, idx: number) => {
                        const isTop = idx === 0;
                        return (
                          <div
                            key={idx}
                            style={{
                              padding: '12px 14px',
                              borderRadius: '14px',
                              background: isTop ? 'rgba(255, 55, 95, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                              border: isTop ? '1px solid rgba(255, 55, 95, 0.4)' : '1px solid rgba(255, 255, 255, 0.06)',
                              transition: 'all 0.2s ease'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{
                                  padding: '3px 8px',
                                  borderRadius: '6px',
                                  background: isTop ? '#FF375F' : 'rgba(255, 255, 255, 0.15)',
                                  color: '#fff',
                                  fontSize: '11.5px',
                                  fontWeight: 700
                                }}>
                                  {route.name}
                                </span>
                                {isTop && (
                                  <span style={{ fontSize: '11px', color: '#30D158', fontWeight: 600 }}>
                                    ● Recommended
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>
                                ~{route.estimated_minutes} min
                              </div>
                            </div>
                            <p style={{ fontSize: '11.5px', color: 'var(--apple-label-secondary)', margin: '4px 0 0', lineHeight: 1.35 }}>
                              {route.description}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: SCHEDULE (Apple Calendar Event Cards & Segmented Days) */}
            {activeTab === 'schedule' && (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                minHeight: 0,
                overflowY: 'auto',
                paddingRight: '2px'
              }}>
                {/* Header with Import Button */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexShrink: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>
                    Registered Courses
                  </div>
                  <label className="apple-btn-secondary" style={{ fontSize: '11.5px', padding: '5px 10px', cursor: 'pointer' }}>
                    <Upload size={12} />
                    {uploading ? "Importing..." : "Import (.ics / Image)"}
                    <input type="file" accept="image/*,.ics,text/calendar" onChange={handleFileUpload} style={{ display: 'none' }} />
                  </label>
                </div>

                {/* Apple Day Segmented Control (Replaces 6 loose buttons) */}
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px', flexShrink: 0 }}>
                  <div className="apple-segmented-control" style={{ width: '100%', justifyContent: 'space-between' }}>
                    {["ALL", "M", "T", "W", "TH", "F"].map((day) => (
                      <button
                        key={day}
                        onClick={() => setSelectedDayFilter(day)}
                        className={`apple-segment-btn ${selectedDayFilter === day ? 'active' : ''}`}
                        style={{ flex: 1, padding: '4px 8px', fontSize: '11.5px' }}
                      >
                        {day === "ALL" ? "All" : day}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Class List */}
                {classes.length === 0 ? (
                  <div style={{
                    padding: '24px 16px',
                    borderRadius: '16px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px dashed rgba(255, 255, 255, 0.12)',
                    textAlign: 'center',
                    marginTop: '12px'
                  }}>
                    <Calendar size={28} color="rgba(235, 235, 245, 0.4)" style={{ margin: '0 auto 8px' }} />
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff', marginBottom: '4px' }}>
                      No Courses Loaded
                    </div>
                    <p style={{ fontSize: '11.5px', color: 'var(--apple-label-secondary)', lineHeight: 1.4, margin: '0 auto 12px', maxWidth: '240px' }}>
                      Import a WebReg screenshot or Canvas .ics file to automatically plan routes between classes.
                    </p>
                    <label className="apple-btn-primary" style={{ fontSize: '12px', cursor: 'pointer' }}>
                      <Upload size={12} />
                      Choose File
                      <input type="file" accept="image/*,.ics,text/calendar" onChange={handleFileUpload} style={{ display: 'none' }} />
                    </label>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
                            padding: '10px 12px',
                            borderRadius: '12px',
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid rgba(255, 255, 255, 0.06)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '10px'
                          }}
                        >
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {cls.course}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--apple-label-secondary)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <MapPin size={11} color="#FF375F" />
                              <span>{cls.location || cls.building} ({cls.campus})</span>
                            </div>
                          </div>

                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#0A84FF', fontVariantNumeric: 'tabular-nums' }}>
                              {cls.startTime} - {cls.endTime}
                            </div>
                            <button
                              onClick={() => handleGetToNextClass(cls)}
                              className="apple-btn-secondary"
                              style={{ padding: '3px 8px', fontSize: '10.5px', marginTop: '4px' }}
                              title="Calculate transit to this class"
                            >
                              Route ➔
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: COPILOT (Apple Intelligence Siri Transit Assistant) */}
            {activeTab === 'copilot' && (
              <div style={{ flex: '1 1 0', minHeight: 0, height: '100%' }}>
                <AICopilotChat currentCampus={currentLocation} />
              </div>
            )}
          </div>
        </div>

        {/* Right Canvas: Spacious Live Rutgers Transit Radar & Fleet Telemetry */}
        <div className="apple-canvas-area">
          <CampusRadar
            buses={buses}
            selectedCampus={originCampus}
            onSelectCampus={(c) => setOriginCampus(c)}
          />
        </div>
      </main>
    </div>
  );
}

export default App;
