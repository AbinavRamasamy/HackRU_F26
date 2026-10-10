import React, { useState, useRef } from 'react';
import { Compass, Navigation, Bus, ChevronDown, RotateCcw } from 'lucide-react';

export interface UpcomingStop {
  station: string;
  eta_mins: number;
}

export interface BusLocation {
  id: string;
  route: string;
  destination: string;
  lat: number;
  lon: number;
  eta_mins: number;
  occupancy: string;
  next_stop: string;
  speed_mph: number;
  campus?: string;
  upcoming_stops?: UpcomingStop[];
}

export interface CampusRadarProps {
  buses: BusLocation[];
  selectedCampus: string;
  onSelectCampus: (campus: string) => void;
  style?: React.CSSProperties;
  isFloatingWidget?: boolean;
}

// Complete Rutgers New Brunswick Bus Fleet
export const ALL_RUTGERS_ROUTES = [
  "Weekend 1",
  "Weekend 2",
  "LX",
  "B",
  "A",
  "H",
  "F",
  "EE",
  "REXB",
  "REXL",
  "C"
];

// Mapping of which bus routes serve which campus
export const CAMPUS_SERVICED_ROUTES: Record<string, string[]> = {
  "College Ave": ["Weekend 1", "Weekend 2", "LX", "A", "H", "F", "EE"],
  "Livingston": ["Weekend 1", "Weekend 2", "LX", "B", "REXL"],
  "Busch": ["Weekend 1", "Weekend 2", "B", "A", "H", "REXB", "C"],
  "Cook / Douglass": ["Weekend 1", "Weekend 2", "F", "EE", "REXB", "REXL"]
};

export const getRoutesForCampus = (campus: string): string[] => {
  if (!campus || campus === "ALL") return ALL_RUTGERS_ROUTES;
  const c = campus.toLowerCase();
  if (c.includes("col")) return CAMPUS_SERVICED_ROUTES["College Ave"];
  if (c.includes("liv")) return CAMPUS_SERVICED_ROUTES["Livingston"];
  if (c.includes("bus")) return CAMPUS_SERVICED_ROUTES["Busch"];
  if (c.includes("cook") || c.includes("doug")) return CAMPUS_SERVICED_ROUTES["Cook / Douglass"];
  return ALL_RUTGERS_ROUTES;
};

export const getRouteColor = (route: string) => {
  if (route.includes("Weekend 1")) return "#0D9488";
  if (route.includes("Weekend 2")) return "#059669";
  if (route === "LX") return "#FF5722";
  if (route === "B") return "#0A84FF";
  if (route === "A") return "#30D158";
  if (route === "H") return "#FF9F0A";
  if (route === "F") return "#BF5AF2";
  if (route === "EE") return "#FF375F";
  if (route === "REXB") return "#64D2FF";
  if (route === "REXL") return "#34D399";
  if (route === "C") return "#8E8E93";
  return "#0A84FF";
};

export const getBusCurrentCampus = (b: BusLocation): string => {
  if (b.campus) return b.campus;
  if (b.lat && b.lon) {
    if (b.lat > 40.515) return b.lon < -74.450 ? "Busch" : "Livingston";
    if (b.lat < 40.492) return "Cook / Douglass";
    return "College Ave";
  }
  const stop = (b.next_stop || b.destination || "").toLowerCase();
  if (stop.includes("livingston") || stop.includes("plaza") || stop.includes("quads") || stop.includes("rbs")) return "Livingston";
  if (stop.includes("busch") || stop.includes("hill") || stop.includes("arc") || stop.includes("stadium")) return "Busch";
  if (stop.includes("cook") || stop.includes("doug") || stop.includes("red oak") || stop.includes("biel") || stop.includes("college hall")) return "Cook / Douglass";
  if (stop.includes("college") || stop.includes("yard") || stop.includes("scott")) return "College Ave";
  return "";
};

export const CampusRadar: React.FC<CampusRadarProps> = ({
  buses,
  selectedCampus,
  onSelectCampus,
  style
}) => {
  const [selectedRoute, setSelectedRoute] = useState<string>("ALL");
  const [expandedBusId, setExpandedBusId] = useState<string | null>(null);
  const dragStartYRef = useRef<{ [key: string]: number }>({});
  const isDraggingRef = useRef<{ [key: string]: boolean }>({});

  const handleCardPointerDown = (id: string, e: React.PointerEvent) => {
    dragStartYRef.current[id] = e.clientY;
    isDraggingRef.current[id] = false;
  };

  const handleCardPointerMove = (id: string, e: React.PointerEvent) => {
    if (dragStartYRef.current[id] !== undefined) {
      const deltaY = e.clientY - dragStartYRef.current[id];
      if (Math.abs(deltaY) > 6) {
        isDraggingRef.current[id] = true;
      }
    }
  };

  const handleCardPointerUp = (id: string, e: React.PointerEvent) => {
    const startY = dragStartYRef.current[id];
    if (startY !== undefined) {
      const deltaY = e.clientY - startY;
      // If user dragged down (> 12px), expand!
      if (deltaY > 12) {
        setExpandedBusId(id);
      } else if (deltaY < -12) {
        // If user dragged up (> 12px), collapse!
        setExpandedBusId(prev => (prev === id ? null : prev));
      } else {
        // Click / tap toggle
        setExpandedBusId(prev => (prev === id ? null : id));
      }
      delete dragStartYRef.current[id];
      delete isDraggingRef.current[id];
    }
  };

  // Active routes from telemetry
  const activeWorkingRoutes = Array.from(new Set(buses.map(b => b.route).filter(Boolean)));
  const campusServicedRoutes = getRoutesForCampus(selectedCampus);

  const workingRoutes = activeWorkingRoutes.length > 0
    ? activeWorkingRoutes.filter(r => campusServicedRoutes.includes(r))
    : campusServicedRoutes;

  const sortedWorkingRoutes = ALL_RUTGERS_ROUTES.filter(r => workingRoutes.includes(r));
  const extraActiveRoutes = workingRoutes.filter(r => !ALL_RUTGERS_ROUTES.includes(r));
  const availableRoutes = ["ALL", ...sortedWorkingRoutes, ...extraActiveRoutes];
  const activeSelectedRoute = availableRoutes.includes(selectedRoute) ? selectedRoute : "ALL";

  const campuses = [
    { name: "College Ave", desc: "The Yard, Scott Hall, SAC", color: "#FF375F" },
    { name: "Livingston", desc: "Student Center, Plaza, RBS", color: "#FF5722" },
    { name: "Busch", desc: "Hill Center, ARC, Stadium", color: "#0A84FF" },
    { name: "Cook / Douglass", desc: "Red Oak Lane, Biel, Lipman", color: "#30D158" }
  ];

  // Filtered bus list
  const filteredBuses = buses.filter(b => {
    if (activeSelectedRoute !== "ALL" && b.route !== activeSelectedRoute) return false;
    if (selectedCampus && selectedCampus !== "ALL") {
      const allowedRoutes = getRoutesForCampus(selectedCampus);
      if (!allowedRoutes.includes(b.route)) return false;
    }
    return true;
  });

  return (
    <div className="apple-panel" style={{
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      minHeight: 0,
      boxSizing: 'border-box',
      ...style
    }}>
      {/* Apple-styled Header: Clean, balanced, decluttered */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '16px',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        {/* Title Group */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '34px',
            height: '34px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, rgba(255, 55, 95, 0.25) 0%, rgba(10, 132, 255, 0.2) 100%)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FF375F'
          }}>
            <Compass size={18} strokeWidth={2} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#fff', margin: 0, letterSpacing: '-0.02em' }}>
                Live Transit Radar
              </h2>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '11px',
                fontWeight: 600,
                color: '#30D158',
                background: 'rgba(48, 209, 88, 0.12)',
                border: '1px solid rgba(48, 209, 88, 0.25)',
                padding: '2px 8px',
                borderRadius: '9999px'
              }}>
                <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#30D158', boxShadow: '0 0 6px #30D158' }} />
                {filteredBuses.length} Active Vehicles
              </span>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--apple-label-secondary)', margin: '2px 0 0' }}>
              Real-time fleet telemetry & campus corridor status
            </p>
          </div>
        </div>

        {/* Apple Route Filter Menu (Replaces the clutter of 12 giant raw buttons) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {selectedCampus && selectedCampus !== "ALL" && (
            <button
              onClick={() => onSelectCampus("ALL")}
              className="apple-btn-secondary"
              title="Reset campus filter to show all"
              style={{ fontSize: '11.5px', padding: '5px 10px', gap: '4px' }}
            >
              <RotateCcw size={12} />
              Reset: {selectedCampus}
            </button>
          )}

          {/* Apple HIG Route Picker Dropdown Capsule */}
          <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '9999px',
              background: 'rgba(118, 118, 128, 0.22)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              fontSize: '12.5px',
              fontWeight: 500,
              color: '#fff'
            }}>
              <Bus size={13} color="#FF375F" />
              <span>Route:</span>
              <select
                value={activeSelectedRoute}
                onChange={(e) => setSelectedRoute(e.target.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: '12.5px',
                  outline: 'none',
                  cursor: 'pointer',
                  paddingRight: '4px'
                }}
              >
                <option value="ALL" style={{ background: '#1c1c1e', color: '#fff' }}>All Routes ({availableRoutes.length - 1} lines)</option>
                {availableRoutes.filter(r => r !== "ALL").map(r => (
                  <option key={r} value={r} style={{ background: '#1c1c1e', color: '#fff' }}>
                    {r}
                  </option>
                ))}
              </select>
              <ChevronDown size={13} color="rgba(235, 235, 245, 0.6)" />
            </div>
          </div>
        </div>
      </div>

      {/* Apple Campus Corridor Tiles (Interactive Glanceable Cards) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '10px',
        marginBottom: '16px',
        flexShrink: 0
      }}>
        {campuses.map(c => {
          const isSelected = selectedCampus.toLowerCase().includes(c.name.toLowerCase().slice(0, 4));
          const allowedRoutes = getRoutesForCampus(c.name);
          const campusBuses = buses.filter(b => {
            if (!allowedRoutes.includes(b.route)) return false;
            if (activeSelectedRoute !== "ALL" && b.route !== activeSelectedRoute) return false;
            const currentCampus = getBusCurrentCampus(b);
            if (currentCampus) {
              return currentCampus.toLowerCase().includes(c.name.toLowerCase().slice(0, 4));
            }
            return false;
          });

          return (
            <div
              key={c.name}
              onClick={() => onSelectCampus(isSelected ? "ALL" : c.name)}
              style={{
                padding: '12px 14px',
                borderRadius: '14px',
                background: isSelected ? 'rgba(255, 55, 95, 0.12)' : 'rgba(255, 255, 255, 0.04)',
                border: isSelected ? '1px solid rgba(255, 55, 95, 0.55)' : '1px solid rgba(255, 255, 255, 0.07)',
                cursor: 'pointer',
                transition: 'all 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
                boxShadow: isSelected ? '0 4px 16px rgba(255, 55, 95, 0.2)' : 'none',
                position: 'relative'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#fff', letterSpacing: '-0.01em' }}>
                  {c.name}
                </span>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: campusBuses.length > 0 ? c.color : 'var(--apple-label-tertiary)',
                  padding: '2px 7px',
                  background: campusBuses.length > 0 ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                  borderRadius: '9999px'
                }}>
                  {campusBuses.length} {campusBuses.length === 1 ? 'bus' : 'buses'}
                </span>
              </div>
              <p style={{ fontSize: '11px', color: 'var(--apple-label-secondary)', marginBottom: '8px', lineHeight: 1.3 }}>
                {c.desc}
              </p>

              {/* Arriving Bus Micro-Pills */}
              <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                {campusBuses.length > 0 ? (
                  campusBuses.slice(0, 3).map(b => (
                    <span key={b.id} style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: '5px',
                      background: getRouteColor(b.route),
                      color: '#fff',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px'
                    }}>
                      {b.route} <span style={{ opacity: 0.9, fontSize: '9px' }}>{b.eta_mins}m</span>
                    </span>
                  ))
                ) : (
                  <span style={{ fontSize: '10.5px', color: 'var(--apple-label-tertiary)' }}>
                    In transit to corridor
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Apple Find My Style Live Fleet Telemetry Grid */}
      <div style={{
        flex: '1 1 0',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        borderRadius: '16px',
        background: 'rgba(0, 0, 0, 0.35)',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        padding: '12px 14px',
        overflow: 'hidden'
      }}>
        <div style={{
          fontSize: '12px',
          fontWeight: 600,
          color: 'var(--apple-label-secondary)',
          marginBottom: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Navigation size={13} color="#FF375F" />
            <span>Vehicles Operating in Corridor</span>
          </div>
          <span style={{ fontSize: '11px', color: 'var(--apple-label-tertiary)' }}>
            Auto-refreshes every 12s
          </span>
        </div>

        {/* Scrollable Vehicle List with Liquid Glass Physics */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gridAutoRows: 'max-content',
          alignContent: 'start',
          gap: '12px',
          overflowY: 'auto',
          flex: '1 1 0',
          paddingRight: '4px',
          paddingBottom: '8px'
        }}>
          {filteredBuses.map(b => {
            const isFull = b.occupancy.toLowerCase().includes('full');
            const isCrowded = b.occupancy.toLowerCase().includes('standing') || b.occupancy.toLowerCase().includes('crowded');
            const statusColor = isFull ? '#FF453A' : isCrowded ? '#FF9F0A' : '#30D158';
            const isExpanded = expandedBusId === b.id;

            return (
              <div
                key={b.id}
                className={`liquid-glass-card ${isExpanded ? 'is-expanded' : ''}`}
                onPointerDown={(e) => handleCardPointerDown(b.id, e)}
                onPointerMove={(e) => handleCardPointerMove(b.id, e)}
                onPointerUp={(e) => handleCardPointerUp(b.id, e)}
                style={{
                  position: 'relative',
                  cursor: 'grab'
                }}
              >
                {/* Fluid Specular Sheen (dynamic glass refraction gloss) */}
                <div className="liquid-specular-gloss" />

                {/* Iridescent Chromatic Border Glow */}
                <div className="liquid-chromatic-glow" />

                {/* Fluid Grab Handle Indicator */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingBottom: '6px',
                  cursor: 'grab'
                }}>
                  <div
                    className="liquid-grab-pill"
                    title="Drag down or tap to expand full route itinerary"
                  />
                </div>

                {/* Card Primary Header */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                    {/* Apple Route Badge Squircle */}
                    <div style={{
                      padding: '4px 8px',
                      minWidth: '42px',
                      height: '26px',
                      borderRadius: '7px',
                      background: getRouteColor(b.route),
                      color: '#fff',
                      fontWeight: 700,
                      fontSize: '11px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      boxShadow: `0 2px 8px ${getRouteColor(b.route)}55`
                    }}>
                      {b.route === "Weekend 1" ? "WKND 1" : b.route === "Weekend 2" ? "WKND 2" : b.route}
                    </div>

                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{
                        fontSize: '12.5px',
                        fontWeight: 650,
                        color: '#fff',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        letterSpacing: '-0.01em'
                      }}>
                        To {b.destination}
                      </div>
                      <div style={{
                        fontSize: '11px',
                        color: 'var(--apple-label-secondary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        marginTop: '1px'
                      }}>
                        <span>Unit #{b.id.slice(-4)}</span>
                        <span>•</span>
                        <span style={{
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {b.next_stop}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: ETA & Status Dot */}
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{
                      fontSize: '14px',
                      fontWeight: 700,
                      color: '#fff',
                      fontVariantNumeric: 'tabular-nums',
                      letterSpacing: '-0.02em',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      gap: '1px'
                    }}>
                      <span>{b.eta_mins}</span>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--apple-label-secondary)' }}>m</span>
                    </div>
                    <div style={{
                      fontSize: '10.5px',
                      fontWeight: 500,
                      color: statusColor,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      gap: '4px'
                    }}>
                      <span
                        className="liquid-beacon-dot"
                        style={{
                          width: '5.5px',
                          height: '5.5px',
                          borderRadius: '50%',
                          background: statusColor,
                          boxShadow: `0 0 6px ${statusColor}`
                        }}
                      />
                      {b.occupancy}
                    </div>
                  </div>
                </div>

                {/* Fluid Route Transit Track (Visual Progression Bar) */}
                <div style={{
                  marginTop: '9px',
                  padding: '6px 9px',
                  borderRadius: '9px',
                  background: 'rgba(0, 0, 0, 0.28)',
                  border: '1px solid rgba(255, 255, 255, 0.04)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    fontSize: '10.5px',
                    color: 'var(--apple-label-secondary)'
                  }}>
                    <Navigation size={11} color="#FF375F" />
                    <span>{b.speed_mph} mph</span>
                  </div>

                  <div style={{
                    flex: 1,
                    height: '3px',
                    borderRadius: '2px',
                    background: 'rgba(255, 255, 255, 0.08)',
                    position: 'relative',
                    overflow: 'hidden',
                    maxWidth: '90px'
                  }}>
                    <div className="liquid-route-flow" style={{ width: '100%', height: '100%' }} />
                  </div>

                  <div style={{
                    fontSize: '10.5px',
                    fontWeight: 500,
                    color: isExpanded ? '#FF375F' : 'var(--apple-label-tertiary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2px'
                  }}>
                    <span>{isExpanded ? 'Expanded' : 'Pull or tap'}</span>
                    <ChevronDown size={11} style={{
                      transform: isExpanded ? 'rotate(180deg)' : 'none',
                      transition: 'transform 0.22s ease'
                    }} />
                  </div>
                </div>

                {/* EXPANDED LIQUID GLASS MULTI-STOP ITINERARY ACCORDION */}
                {isExpanded && (
                  <div style={{
                    marginTop: '11px',
                    paddingTop: '11px',
                    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                    animation: 'apple-fade-in 0.22s cubic-bezier(0.16, 1, 0.3, 1)'
                  }}>
                    <div style={{
                      fontSize: '10.5px',
                      fontWeight: 650,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      color: 'var(--apple-label-secondary)',
                      marginBottom: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}>
                      <span>Upcoming Route Stations</span>
                      <span style={{ fontSize: '10px', color: 'var(--apple-label-tertiary)' }}>Live GPS</span>
                    </div>

                    {/* Multi-stop upcoming itinerary timeline */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      {b.upcoming_stops && b.upcoming_stops.length > 0 ? (
                        b.upcoming_stops.map((stop, sIdx) => (
                          <div
                            key={sIdx}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '5px 8px',
                              borderRadius: '7px',
                              background: sIdx === 0 ? 'rgba(255, 55, 95, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                              border: sIdx === 0 ? '1px solid rgba(255, 55, 95, 0.25)' : '1px solid rgba(255, 255, 255, 0.04)'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', minWidth: 0, flex: 1 }}>
                              <div style={{
                                width: '5px',
                                height: '5px',
                                borderRadius: '50%',
                                background: sIdx === 0 ? '#FF375F' : 'rgba(255, 255, 255, 0.3)',
                                boxShadow: sIdx === 0 ? '0 0 5px #FF375F' : 'none'
                              }} />
                              <span style={{
                                fontSize: '11px',
                                fontWeight: sIdx === 0 ? 600 : 400,
                                color: sIdx === 0 ? '#fff' : 'var(--apple-label-secondary)',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}>
                                {stop.station}
                              </span>
                            </div>
                            <div style={{
                              fontSize: '11px',
                              fontWeight: 650,
                              color: sIdx === 0 ? '#FF375F' : 'var(--apple-label-secondary)',
                              fontVariantNumeric: 'tabular-nums',
                              marginLeft: '8px'
                            }}>
                              {stop.eta_mins}m
                            </div>
                          </div>
                        ))
                      ) : (
                        <div style={{
                          fontSize: '11px',
                          color: 'var(--apple-label-secondary)',
                          padding: '6px 8px',
                          background: 'rgba(255, 255, 255, 0.03)',
                          borderRadius: '7px'
                        }}>
                          Next: <strong>{b.next_stop}</strong> • Dest: <strong>{b.destination}</strong>
                        </div>
                      )}
                    </div>

                    {/* Telemetry Footer */}
                    <div style={{
                      marginTop: '9px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '9.5px',
                      color: 'var(--apple-label-tertiary)',
                      padding: '0 2px'
                    }}>
                      <span>GPS: {b.lat ? `${b.lat.toFixed(4)}, ${b.lon.toFixed(4)}` : 'Live'}</span>
                      <span>Drag up or tap to close</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
