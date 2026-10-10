import React, { useState } from 'react';
import { Navigation, Compass, ChevronDown, ChevronUp } from 'lucide-react';

interface BusLocation {
  id: string;
  route: string;
  destination: string;
  lat: number;
  lon: number;
  eta_mins: number;
  occupancy: string;
  next_stop: string;
  speed_mph: number;
}

interface CampusRadarProps {
  buses: BusLocation[];
  selectedCampus: string;
  onSelectCampus: (campus: string) => void;
  style?: React.CSSProperties;
  isFloatingWidget?: boolean;
}

export const CampusRadar: React.FC<CampusRadarProps> = ({
  buses,
  selectedCampus,
  onSelectCampus,
  style,
  isFloatingWidget = false
}) => {
  const [selectedRoute, setSelectedRoute] = useState<string>("ALL");
  const [minimized, setMinimized] = useState(false);

  const campuses = [
    { name: "College Ave", desc: "The Yard, Scott Hall, Student Center", color: "#cc0033" },
    { name: "Livingston", desc: "LSC, Plaza, Quads, RBS", color: "#ff5722" },
    { name: "Busch", desc: "Hill Center, ARC, Weeks, BSC", color: "#3b82f6" },
    { name: "Cook / Douglass", desc: "College Hall, Red Oak Lane, Biel Rd", color: "#10b981" }
  ];

  // Filter by both route and selected campus
  const filteredBuses = buses.filter(b => {
    // Route filter
    if (selectedRoute !== "ALL" && b.route !== selectedRoute) {
      return false;
    }
    // Campus filter (if a campus card is selected)
    if (selectedCampus && selectedCampus !== "ALL") {
      const bCampus = (b as any).campus || "";
      const bStop = b.next_stop || "";
      const match = bCampus.toLowerCase().includes(selectedCampus.toLowerCase().slice(0, 4)) ||
                    bStop.toLowerCase().includes(selectedCampus.toLowerCase().slice(0, 4));
      if (!match) return false;
    }
    return true;
  });

  const floatingWidgetStyle: React.CSSProperties = isFloatingWidget ? {
    borderRadius: '16px',
    background: 'rgba(18, 20, 29, 0.92)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    boxShadow: '0 12px 36px rgba(0, 0, 0, 0.7), 0 0 24px rgba(204, 0, 51, 0.12)',
    padding: '12px 18px'
  } : {
    padding: '12px 18px'
  };

  return (
    <div className="glass-panel" style={{ ...floatingWidgetStyle, ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            background: 'rgba(204, 0, 51, 0.2)',
            padding: '6px',
            borderRadius: '8px',
            color: '#ff4d6d'
          }}>
            <Compass size={18} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#fff', margin: 0 }}>Live Rutgers Transit Radar</h3>
              {selectedCampus && selectedCampus !== "ALL" && (
                <button
                  onClick={() => onSelectCampus("ALL")}
                  style={{
                    fontSize: '10px',
                    padding: '2px 7px',
                    borderRadius: '10px',
                    background: 'rgba(204, 0, 51, 0.2)',
                    color: '#ff4d6d',
                    border: '1px solid rgba(204, 0, 51, 0.4)',
                    fontWeight: 700
                  }}
                >
                  Filtered: {selectedCampus} ✕
                </button>
              )}
            </div>
            <p style={{ fontSize: '11px', color: '#9ca3af', margin: 0 }}>
              Click any campus card to isolate buses operating on that campus
            </p>
          </div>
        </div>

        {/* Route Filter Pills & Minimize Toggle */}
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
          {["ALL", "Weekend 1", "Weekend 2", "LX", "B", "A", "H", "F", "EE", "REXB"].map(route => (
            <button
              key={route}
              onClick={() => setSelectedRoute(route)}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 700,
                background: selectedRoute === route ? 'rgba(204,0,51,0.3)' : 'rgba(255,255,255,0.03)',
                color: selectedRoute === route ? '#ff4d6d' : '#9ca3af',
                border: selectedRoute === route ? '1px solid rgba(204,0,51,0.5)' : '1px solid rgba(255,255,255,0.06)'
              }}
            >
              {route}
            </button>
          ))}

          {isFloatingWidget && (
            <button
              onClick={() => setMinimized(prev => !prev)}
              title={minimized ? "Expand Floating Widget" : "Minimize Floating Widget"}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 10px',
                borderRadius: '6px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: '#e5e7eb',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                marginLeft: '4px'
              }}
            >
              {minimized ? (
                <>Expand <ChevronUp size={13} /></>
              ) : (
                <>Minimize <ChevronDown size={13} /></>
              )}
            </button>
          )}
        </div>
      </div>

      {!minimized && (
        <>
          {/* Visual Campus Corridors Graph */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '10px',
        marginBottom: '12px'
      }}>
        {campuses.map(c => {
          const isSelected = selectedCampus.toLowerCase().includes(c.name.toLowerCase().slice(0, 4));
          // Filter buses that are either tagged with this campus or have next stop on this campus
          const campusBuses = buses.filter(b => {
            const bCampus = (b as any).campus || "";
            const bStop = b.next_stop || "";
            return bCampus.toLowerCase().includes(c.name.toLowerCase().slice(0, 4)) ||
                   bStop.toLowerCase().includes(c.name.toLowerCase().slice(0, 4));
          });

          return (
            <div
              key={c.name}
              onClick={() => onSelectCampus(c.name)}
              style={{
                padding: '10px 12px',
                borderRadius: '10px',
                background: isSelected ? 'rgba(204, 0, 51, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                border: isSelected ? '1px solid rgba(204, 0, 51, 0.6)' : '1px solid rgba(255, 255, 255, 0.05)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                position: 'relative'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>{c.name}</span>
                <span style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  color: campusBuses.length > 0 ? c.color : '#9ca3af',
                  padding: '2px 6px',
                  background: campusBuses.length > 0 ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)',
                  borderRadius: '8px'
                }}>
                  {campusBuses.length} buses
                </span>
              </div>
              <p style={{ fontSize: '10px', color: '#9ca3af', marginBottom: '8px', lineHeight: 1.3 }}>{c.desc}</p>
              
              <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                {campusBuses.length > 0 ? (
                  campusBuses.map(b => (
                    <span key={b.id} style={{
                      fontSize: '9px',
                      fontWeight: 800,
                      padding: '2px 5px',
                      borderRadius: '4px',
                      background: b.route.includes('Weekend 1') ? '#0d9488' : b.route.includes('Weekend 2') ? '#10b981' : b.route === 'LX' ? '#ff5722' : b.route === 'B' ? '#3b82f6' : '#6366f1',
                      color: '#fff'
                    }}>
                      {b.route === 'Weekend 1' ? 'WKND 1' : b.route === 'Weekend 2' ? 'WKND 2' : b.route} ({b.eta_mins}m)
                    </span>
                  ))
                ) : (
                  <span style={{ fontSize: '9px', color: '#6b7280', fontStyle: 'italic' }}>
                    Circulating nearby
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Live Fleet Tracking List */}
      <div style={{
        background: 'rgba(0,0,0,0.25)',
        borderRadius: '10px',
        padding: '10px 12px',
        border: '1px solid rgba(255,255,255,0.04)'
      }}>
        <div style={{ fontSize: '11px', fontWeight: 700, color: '#9ca3af', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Navigation size={13} color="#ff3366" />
          <span>Active Rutgers Fleet Telemetry ({filteredBuses.length} Vehicles Tracked)</span>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '8px',
          maxHeight: '85px',
          overflowY: 'auto',
          paddingRight: '4px'
        }}>
          {filteredBuses.map(b => (
            <div key={b.id} style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 10px',
              borderRadius: '8px',
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
              overflow: 'hidden'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1, marginRight: '8px' }}>
                <div style={{
                  padding: '3px 6px',
                  minWidth: '44px',
                  height: '26px',
                  borderRadius: '5px',
                  background: b.route.includes('Weekend 1') ? '#0d9488' : b.route.includes('Weekend 2') ? '#10b981' : b.route === 'LX' ? '#ff5722' : b.route === 'B' ? '#3b82f6' : '#6366f1',
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  whiteSpace: 'nowrap'
                }}>
                  {b.route === "Weekend 1" ? "WKND 1" : b.route === "Weekend 2" ? "WKND 2" : b.route}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#fff',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    To {b.destination}
                  </div>
                  <div style={{
                    fontSize: '10px',
                    color: '#9ca3af',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    marginTop: '1px'
                  }}>
                    {b.next_stop} • {b.speed_mph} mph
                  </div>
                </div>
              </div>

              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#38bdf8' }}>{b.eta_mins} mins</div>
                <div style={{ fontSize: '9px', fontWeight: 600, color: b.occupancy.includes('Full') ? '#f87171' : '#34d399' }}>{b.occupancy}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )}
</div>
  );
};
