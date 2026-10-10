import React, { useState } from 'react';
import { Navigation, Compass } from 'lucide-react';

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
}

export const CampusRadar: React.FC<CampusRadarProps> = ({
  buses,
  selectedCampus,
  onSelectCampus,
  style
}) => {
  const [selectedRoute, setSelectedRoute] = useState<string>("ALL");

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

  return (
    <div className="glass-panel" style={{ padding: '24px', ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            background: 'rgba(204, 0, 51, 0.2)',
            padding: '8px',
            borderRadius: '10px',
            color: '#ff4d6d'
          }}>
            <Compass size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>Live Rutgers Transit Radar</h3>
              {selectedCampus && selectedCampus !== "ALL" && (
                <button
                  onClick={() => onSelectCampus("ALL")}
                  style={{
                    fontSize: '11px',
                    padding: '2px 8px',
                    borderRadius: '12px',
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
            <p style={{ fontSize: '12px', color: '#9ca3af' }}>
              Click any campus card below to isolate buses operating on that campus
            </p>
          </div>
        </div>

        {/* Route Filter Pills */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
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
        </div>
      </div>

      {/* Visual Campus Corridors Graph */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
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
                padding: '16px',
                borderRadius: '12px',
                background: isSelected ? 'rgba(204, 0, 51, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                border: isSelected ? '1px solid rgba(204, 0, 51, 0.6)' : '1px solid rgba(255, 255, 255, 0.05)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                position: 'relative'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>{c.name}</span>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: campusBuses.length > 0 ? c.color : '#9ca3af',
                  padding: '2px 8px',
                  background: campusBuses.length > 0 ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)',
                  borderRadius: '10px'
                }}>
                  {campusBuses.length} active buses
                </span>
              </div>
              <p style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '12px' }}>{c.desc}</p>
              
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {campusBuses.length > 0 ? (
                  campusBuses.map(b => (
                    <span key={b.id} style={{
                      fontSize: '10px',
                      fontWeight: 800,
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: b.route.includes('Weekend 1') ? '#0d9488' : b.route.includes('Weekend 2') ? '#10b981' : b.route === 'LX' ? '#ff5722' : b.route === 'B' ? '#3b82f6' : '#6366f1',
                      color: '#fff'
                    }}>
                      {b.route === 'Weekend 1' ? 'WKND 1' : b.route === 'Weekend 2' ? 'WKND 2' : b.route} ({b.eta_mins}m)
                    </span>
                  ))
                ) : (
                  <span style={{ fontSize: '10px', color: '#6b7280', fontStyle: 'italic' }}>
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
        borderRadius: '12px',
        padding: '16px',
        border: '1px solid rgba(255,255,255,0.04)'
      }}>
        <div style={{ fontSize: '12px', fontWeight: 700, color: '#9ca3af', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Navigation size={14} color="#ff3366" />
          <span>Active Rutgers Fleet Telemetry ({filteredBuses.length} Vehicles Tracked)</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '12px' }}>
          {filteredBuses.map(b => (
            <div key={b.id} style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 14px',
              borderRadius: '10px',
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
              overflow: 'hidden'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1, marginRight: '10px' }}>
                <div style={{
                  padding: '4px 8px',
                  minWidth: '50px',
                  height: '32px',
                  borderRadius: '6px',
                  background: b.route.includes('Weekend 1') ? '#0d9488' : b.route.includes('Weekend 2') ? '#10b981' : b.route === 'LX' ? '#ff5722' : b.route === 'B' ? '#3b82f6' : '#6366f1',
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: '11px',
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
                    fontSize: '13px',
                    fontWeight: 700,
                    color: '#fff',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    To {b.destination}
                  </div>
                  <div style={{
                    fontSize: '11px',
                    color: '#9ca3af',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    marginTop: '2px'
                  }}>
                    {b.next_stop} • {b.speed_mph} mph
                  </div>
                </div>
              </div>

              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: '15px', fontWeight: 800, color: '#38bdf8' }}>{b.eta_mins} mins</div>
                <div style={{ fontSize: '10px', fontWeight: 600, color: b.occupancy.includes('Full') ? '#f87171' : '#34d399' }}>{b.occupancy}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
