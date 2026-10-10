import React, { useState, useEffect } from 'react';
import { Bus, AlertTriangle, ChevronUp, ChevronDown, Sparkles, MapPin } from 'lucide-react';

interface BusItem {
  id: string;
  route: string;
  destination: string;
  eta_mins: number;
  occupancy: string;
  next_stop: string;
}

interface TransitWidgetProps {
  currentCampus?: string;
  nextClass?: {
    course: string;
    campus: string;
    building: string;
    startTime: string;
  };
}

export const TransitWidget: React.FC<TransitWidgetProps> = ({
  currentCampus: _currentCampus = "College Ave",
  nextClass
}) => {
  const [expanded, setExpanded] = useState(false);
  const [buses, setBuses] = useState<BusItem[]>([]);

  useEffect(() => {
    const fetchTelemetry = async () => {
      try {
        const res = await fetch("http://localhost:8000/api/telemetry");
        if (res.ok) {
          const data = await res.json();
          setBuses(data.buses || []);
        } else {
          // Fallback mock
          setBuses([
            { id: "1", route: "LX", destination: "Livingston", eta_mins: 4, occupancy: "Seats Available", next_stop: "The Yard" },
            { id: "2", route: "B", destination: "Busch", eta_mins: 8, occupancy: "Crowded", next_stop: "Hill Center" },
            { id: "3", route: "A", destination: "Busch", eta_mins: 11, occupancy: "Standing Only", next_stop: "Student Center" }
          ]);
        }
      } catch (err) {
        setBuses([
          { id: "1", route: "LX", destination: "Livingston", eta_mins: 4, occupancy: "Seats Available", next_stop: "The Yard" },
          { id: "2", route: "B", destination: "Busch", eta_mins: 8, occupancy: "Crowded", next_stop: "Hill Center" }
        ]);
      }
    };

    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 15000);
    return () => clearInterval(interval);
  }, []);

  const primaryBus = buses[0] || {
    route: "LX",
    destination: "Livingston",
    eta_mins: 4,
    next_stop: "The Yard",
    occupancy: "Seats Available"
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      zIndex: 9999,
      maxWidth: '380px',
      width: 'calc(100vw - 48px)'
    }}>
      {/* Expanded Card */}
      {expanded && (
        <div className="glass-panel" style={{
          padding: '20px',
          marginBottom: '12px',
          border: '1px solid rgba(204, 0, 51, 0.3)',
          animation: 'fadeIn 0.2s ease-in-out'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                background: 'rgba(204,0,51,0.2)',
                color: '#ff4d6d',
                padding: '6px',
                borderRadius: '8px'
              }}>
                <Sparkles size={16} />
              </div>
              <span style={{ fontSize: '14px', fontWeight: 700, color: '#f3f4f6' }}>AI Transit Copilot</span>
            </div>
            <span style={{
              fontSize: '11px',
              padding: '3px 8px',
              background: 'rgba(16, 185, 129, 0.15)',
              color: '#34d399',
              borderRadius: '12px',
              fontWeight: 600
            }}>Live Sync</span>
          </div>

          {nextClass && (
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              borderRadius: '10px',
              padding: '12px',
              marginBottom: '14px',
              border: '1px solid rgba(255,255,255,0.05)'
            }}>
              <div style={{ fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Next Destination</div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#fff', marginTop: '2px' }}>{nextClass.course}</div>
              <div style={{ fontSize: '12px', color: '#d1d5db', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                <MapPin size={12} color="#cc0033" />
                {nextClass.building} ({nextClass.campus}) at {nextClass.startTime}
              </div>
            </div>
          )}

          <div style={{ fontSize: '12px', fontWeight: 600, color: '#9ca3af', marginBottom: '8px' }}>Incoming Campus Buses</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
            {buses.map((bus) => (
              <div key={bus.id} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                background: 'rgba(255,255,255,0.02)',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.04)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: bus.route === 'LX' ? '#ff5722' : bus.route === 'B' ? '#3b82f6' : '#10b981',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '12px'
                  }}>
                    {bus.route}
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#f3f4f6' }}>To {bus.destination}</div>
                    <div style={{ fontSize: '11px', color: '#9ca3af' }}>{bus.next_stop} • {bus.occupancy}</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '15px', fontWeight: 800, color: '#38bdf8' }}>{bus.eta_mins}m</span>
                </div>
              </div>
            ))}
          </div>

          <div style={{
            marginTop: '14px',
            fontSize: '11px',
            color: '#fbbf24',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(245, 158, 11, 0.1)',
            padding: '8px 10px',
            borderRadius: '8px'
          }}>
            <AlertTriangle size={14} />
            <span>Heavy traffic on Route 18. Leave 10 mins earlier.</span>
          </div>
        </div>
      )}

      {/* Floating Pill / Mini Trigger */}
      <div 
        onClick={() => setExpanded(!expanded)}
        className="glass-panel"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 18px',
          cursor: 'pointer',
          border: '1px solid rgba(204, 0, 51, 0.5)',
          boxShadow: '0 8px 24px rgba(204, 0, 51, 0.25)',
          transition: 'transform 0.2s ease, border-color 0.2s ease'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #cc0033 0%, #800020 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            boxShadow: '0 4px 12px rgba(204, 0, 51, 0.4)'
          }}>
            <Bus size={20} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '14px', fontWeight: 800, color: '#fff' }}>Route {primaryBus.route}</span>
              <span style={{
                fontSize: '11px',
                background: 'rgba(204, 0, 51, 0.25)',
                color: '#ff4d6d',
                padding: '1px 6px',
                borderRadius: '6px',
                fontWeight: 700
              }}>
                in {primaryBus.eta_mins} mins
              </span>
            </div>
            <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>
              Board at {primaryBus.next_stop}
            </div>
          </div>
        </div>

        <button style={{
          background: 'transparent',
          color: '#9ca3af',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {expanded ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
        </button>
      </div>
    </div>
  );
};
