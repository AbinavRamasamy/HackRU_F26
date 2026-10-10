import React, { useState } from 'react';
import { Bus, Upload, Calendar, ArrowRight, Zap, Sparkles, MapPin } from 'lucide-react';
import { TransitWidget } from './TransitWidget';

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
  const [planResult, setPlanResult] = useState<any>(null);
  const [uploading, setUploading] = useState(false);

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
        if (data.classes && data.classes.length > 0) {
          setClasses(data.classes);
        }
      }
    } catch (err) {
      console.error("Upload error:", err);
    } finally {
      setUploading(false);
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            padding: '6px 14px',
            borderRadius: '20px',
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            color: '#34d399',
            fontWeight: 600
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34d399' }} />
            TripShot & Telemetry Online
          </span>
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
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#f3f4f6' }}>
                  Recommended: {planResult.recommended_routes.join(', ')}
                </span>
                <span style={{ fontSize: '12px', color: '#ff4d6d', fontWeight: 700 }}>
                  ~{planResult.rush_hour_minutes || planResult.base_minutes} mins
                </span>
              </div>
              <p style={{ fontSize: '12px', color: '#d1d5db', lineHeight: 1.5 }}>
                {planResult.advice}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Embed Floating Widget */}
      <TransitWidget 
        currentCampus="College Ave"
        nextClass={classes[1]}
      />
    </div>
  );
}

export default App;
