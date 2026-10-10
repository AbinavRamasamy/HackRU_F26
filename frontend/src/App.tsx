import React, { useState, useEffect } from 'react';
import { Bus, Upload, Calendar, ArrowRight, Zap, Sparkles, MapPin, Code } from 'lucide-react';
import { TransitWidget } from './TransitWidget';
import { CampusRadar } from './CampusRadar';
import { AICopilotChat } from './AICopilotChat';
import { WidgetEmbedModal } from './WidgetEmbedModal';

interface ClassItem {
  course: string;
  days: string[];
  startTime: string;
  endTime: string;
  building: string;
  campus: string;
  closest_stop?: string;
}

export function App() {
  const [classes, setClasses] = useState<ClassItem[]>([
    {
      course: "Intro to Computer Science (01:198:111)",
      days: ["M", "TH"],
      startTime: "10:20",
      endTime: "11:40",
      building: "Hill Center 114",
      campus: "Busch",
      closest_stop: "Hill Center"
    },
    {
      course: "Linear Algebra (01:640:250)",
      days: ["M", "TH"],
      startTime: "12:10",
      endTime: "13:30",
      building: "Tillett Hall 254",
      campus: "Livingston",
      closest_stop: "Livingston Student Center"
    },
    {
      course: "Data Structures (01:198:112)",
      days: ["T", "F"],
      startTime: "14:00",
      endTime: "15:20",
      building: "Academic Building 1180",
      campus: "College Ave",
      closest_stop: "The Yard"
    }
  ]);

  const [originCampus, setOriginCampus] = useState("Busch");
  const [destCampus, setDestCampus] = useState("Livingston");
  const [currentLocation, setCurrentLocation] = useState("Busch Student Center");
  const [planResult, setPlanResult] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [showEmbedModal, setShowEmbedModal] = useState(false);
  const [buses, setBuses] = useState<any[]>([]);

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
        recommended_routes: originCampus === "Busch" && destCampus === "Livingston" ? ["B"] : ["LX"],
        base_minutes: 7,
        rush_hour_minutes: 14,
        advice: `Board the ${originCampus === "Busch" && destCampus === "Livingston" ? "B" : "LX"} bus. Allow ~14 mins during peak transitions.`
      });
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
          alert("Notice: GEMINI_API_KEY is not set in your .env file.\n\nTo parse your custom WebReg screenshot, add GEMINI_API_KEY=your_key to your .env file and restart the backend. Loaded default demo classes.");
        } else if (data.status === "error") {
          alert("OCR Parsing Notice: " + (data.message || "Failed to parse image. Please ensure the image is clear."));
        }

        if (data.classes && data.classes.length > 0) {
          setClasses(data.classes);
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
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px', minHeight: '100vh' }}>
      {/* Top Navbar */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '48px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #cc0033 0%, #800020 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(204, 0, 51, 0.4)'
          }}>
            <Bus size={24} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 800, letterSpacing: '-0.5px', color: '#fff' }}>
              Scarlet<span style={{ color: '#ff3366' }}>Hop</span>
            </h1>
            <p style={{ fontSize: '12px', color: '#9ca3af' }}>Predictive Rutgers Transit Copilot</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            padding: '4px 10px',
            borderRadius: '20px',
            background: 'rgba(204, 0, 51, 0.15)',
            border: '1px solid rgba(204, 0, 51, 0.35)',
            color: '#ff4d6d',
            fontWeight: 700
          }}>
            <MapPin size={13} color="#ff3366" />
            <span>At:</span>
            <select
              value={currentLocation}
              onChange={(e) => {
                setCurrentLocation(e.target.value);
                if (e.target.value.includes("Busch")) setOriginCampus("Busch");
                else if (e.target.value.includes("Livingston")) setOriginCampus("Livingston");
                else if (e.target.value.includes("College")) setOriginCampus("College Ave");
                else setOriginCampus("Cook");
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#fff',
                fontSize: '12px',
                fontWeight: 700,
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="Busch Student Center" style={{ background: '#161922' }}>Busch Student Center</option>
              <option value="Hill Center (Busch)" style={{ background: '#161922' }}>Hill Center (Busch)</option>
              <option value="The Yard (College Ave)" style={{ background: '#161922' }}>The Yard (College Ave)</option>
              <option value="Livingston Student Center" style={{ background: '#161922' }}>Livingston Student Center</option>
              <option value="College Hall (Douglass)" style={{ background: '#161922' }}>College Hall (Douglass)</option>
            </select>
          </div>

          <button
            onClick={() => setShowEmbedModal(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              padding: '6px 14px',
              borderRadius: '20px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#f3f4f6',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <Code size={13} color="#ff4d6d" />
            Embed Widget
          </button>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              padding: '6px 14px',
              borderRadius: '20px',
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
              background: '#34d399'
            }} />
            Transitstat.us (TripShot Live)
          </div>
        </div>
      </header>

      {/* Hero Header */}
      <section style={{ textAlign: 'center', marginBottom: '56px' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 16px',
          borderRadius: '24px',
          background: 'rgba(204, 0, 51, 0.12)',
          border: '1px solid rgba(204, 0, 51, 0.3)',
          color: '#ff4d6d',
          fontSize: '13px',
          fontWeight: 700,
          marginBottom: '16px'
        }}>
          <Sparkles size={16} /> Powered by Multimodal AI & Live Rutgers Feeds
        </div>
        <h2 style={{ fontSize: '42px', fontWeight: 800, letterSpacing: '-1px', lineHeight: 1.2, marginBottom: '16px' }}>
          Never Miss A Class Across the <span className="scarlet-gradient-text">Rutgers Banks</span>
        </h2>
        <p style={{ fontSize: '16px', color: '#9ca3af', maxWidth: '640px', margin: '0 auto' }}>
          Upload your course schedule or inspect real-time inter-campus bus routes. Our AI handles the walking buffers, Route 18 congestion, and tight transfers.
        </p>
      </section>

      {/* Main Grid: Schedule Section & Transit Planner */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '28px', marginBottom: '56px' }}>
        {/* Card 1: Course Schedule Ingestion */}
        <div className="glass-panel" style={{ padding: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Calendar size={20} color="#ff3366" />
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>Your Schedule</h3>
            </div>
            <label style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '8px',
              background: 'rgba(204, 0, 51, 0.15)',
              border: '1px solid rgba(204, 0, 51, 0.4)',
              color: '#ff4d6d',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer'
            }}>
              <Upload size={14} />
              {uploading ? "Analyzing..." : "Upload Schedule OCR"}
              <input type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} />
            </label>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {classes.map((cls, idx) => (
              <div key={idx} style={{
                padding: '14px',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>{cls.course}</div>
                  <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MapPin size={12} color="#cc0033" />
                    <span>{cls.building} • <strong style={{ color: '#e5e7eb' }}>{cls.campus}</strong></span>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#38bdf8' }}>{cls.startTime} - {cls.endTime}</div>
                  <div style={{ fontSize: '11px', color: '#6b7280' }}>{cls.days.join(', ')}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Card 2: Inter-Campus Transit Routing */}
        <div className="glass-panel" style={{ padding: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <Zap size={20} color="#ff3366" />
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>Inter-Campus Commute Planner</h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
            <div>
              <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '6px' }}>Origin Campus</label>
              <select 
                value={originCampus} 
                onChange={(e) => setOriginCampus(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#fff',
                  fontSize: '14px',
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
              <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '6px' }}>Destination Campus</label>
              <select 
                value={destCampus} 
                onChange={(e) => setDestCampus(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#fff',
                  fontSize: '14px',
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
              padding: '12px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #cc0033 0%, #a00028 100%)',
              color: '#fff',
              fontWeight: 700,
              fontSize: '14px',
              boxShadow: '0 4px 16px rgba(204, 0, 51, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              marginBottom: '20px'
            }}
          >
            Compute Smart Route <ArrowRight size={16} />
          </button>

          {planResult && (
            <div style={{
              padding: '16px',
              borderRadius: '10px',
              background: 'rgba(204, 0, 51, 0.08)',
              border: '1px solid rgba(204, 0, 51, 0.25)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase', fontWeight: 700 }}>Best Route:</span>
                  <span style={{
                    fontSize: '14px',
                    fontWeight: 800,
                    color: '#fff',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    background: planResult.primary_route?.includes('Weekend') ? '#0d9488' : '#cc0033'
                  }}>
                    {planResult.primary_route || planResult.recommended_routes?.[0]}
                  </span>
                  {planResult.alternative_routes && planResult.alternative_routes.length > 0 && (
                    <span style={{ fontSize: '11px', color: '#9ca3af' }}>
                      (Alt: {planResult.alternative_routes.join(', ')})
                    </span>
                  )}
                </div>
                <span style={{ fontSize: '13px', color: '#ff4d6d', fontWeight: 800 }}>
                  ~{planResult.rush_hour_minutes || planResult.base_minutes} mins
                </span>
              </div>
              <p style={{ fontSize: '12px', color: '#d1d5db', lineHeight: 1.5, marginTop: '6px' }}>
                {planResult.advice}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Campus Radar & Fleet Visualizer */}
      <CampusRadar 
        buses={buses}
        selectedCampus={originCampus}
        onSelectCampus={(c) => setOriginCampus(c)}
      />

      {/* AI Copilot Chat Assistant */}
      <AICopilotChat currentCampus={currentLocation} />

      {/* Embed Floating Widget */}
      <TransitWidget 
        currentCampus={currentLocation}
        nextClass={classes[1]}
      />

      {/* Embed Code Modal */}
      <WidgetEmbedModal 
        isOpen={showEmbedModal}
        onClose={() => setShowEmbedModal(false)}
      />
    </div>
  );
}

export default App;
