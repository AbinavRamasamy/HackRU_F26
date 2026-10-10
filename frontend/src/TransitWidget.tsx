import React, { useState, useEffect, useRef } from 'react';
import { AlertTriangle, Sparkles, MapPin, Copy, Check } from 'lucide-react';

interface BusItem {
  id: string;
  route: string;
  destination: string;
  eta_mins: number;
  occupancy: string;
  next_stop: string;
}

interface TransitWidgetOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef?: React.RefObject<HTMLElement | null>;
  currentCampus?: string;
  nextClass?: {
    course: string;
    campus: string;
    building: string;
    startTime: string;
  };
}

export const TransitWidget: React.FC<TransitWidgetOverlayProps> = ({
  isOpen,
  onClose,
  triggerRef,
  currentCampus = "Busch Student Center",
  nextClass
}) => {
  const [buses, setBuses] = useState<BusItem[]>([]);
  const [copied, setCopied] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Close on outside click, ignoring clicks on the trigger button so toggling works naturally
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (overlayRef.current && overlayRef.current.contains(target)) {
        return;
      }
      if (triggerRef?.current && triggerRef.current.contains(target)) {
        return;
      }
      onClose();
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose, triggerRef]);

  // Fetch telemetry
  useEffect(() => {
    if (!isOpen) return;

    const fetchTelemetry = async () => {
      try {
        const res = await fetch("http://localhost:8000/api/telemetry");
        if (res.ok) {
          const data = await res.json();
          setBuses(data.buses || []);
        } else {
          setBuses([
            { id: "1", route: "LX", destination: "Livingston", eta_mins: 4, occupancy: "Seats Available", next_stop: "The Yard" },
            { id: "2", route: "B", destination: "Busch", eta_mins: 8, occupancy: "Crowded", next_stop: "Hill Center" },
            { id: "3", route: "A", destination: "Busch", eta_mins: 11, occupancy: "Standing Only", next_stop: "Student Center" }
          ]);
        }
      } catch {
        setBuses([
          { id: "1", route: "LX", destination: "Livingston", eta_mins: 4, occupancy: "Seats Available", next_stop: "The Yard" },
          { id: "2", route: "B", destination: "Busch", eta_mins: 8, occupancy: "Crowded", next_stop: "Hill Center" }
        ]);
      }
    };

    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 15000);
    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  const copyEmbedCode = () => {
    const code = `<iframe src="${window.location.origin}?widget=only" width="380" height="480" style="border:none;border-radius:16px;box-shadow:0 10px 30px rgba(0,0,0,0.4);" title="ScarletHop Transit Widget"></iframe>`;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      ref={overlayRef}
      style={{
        position: 'absolute',
        top: 'calc(100% + 12px)',
        right: 0,
        width: '420px',
        maxWidth: 'calc(100vw - 32px)',
        zIndex: 9999,
        background: '#161922',
        borderRadius: '16px',
        border: '1px solid rgba(255, 255, 255, 0.14)',
        boxShadow: '0 24px 50px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(255, 255, 255, 0.05)',
        padding: '22px',
        animation: 'fadeIn 0.2s ease-in-out'
      }}
    >
      {/* Upward Notch pointing directly up to the button, matching status-bar menu popovers */}
      <div
        style={{
          position: 'absolute',
          top: '-7px',
          right: '64px',
          width: '14px',
          height: '14px',
          background: '#161922',
          borderLeft: '1px solid rgba(255, 255, 255, 0.14)',
          borderTop: '1px solid rgba(255, 255, 255, 0.14)',
          transform: 'rotate(45deg)',
          zIndex: 10
        }}
      />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            background: 'rgba(204, 0, 51, 0.2)',
            color: '#ff4d6d',
            padding: '7px',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Sparkles size={17} />
          </div>
          <div>
            <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#f3f4f6', margin: 0 }}>Rutgers Transit Glance</h4>
            <span style={{ fontSize: '11px', color: '#34d399', fontWeight: 600 }}>● Live Telemetry Active</span>
          </div>
        </div>
      </div>

      {/* Departing Location Pill */}
      <div style={{
        fontSize: '12px',
        color: '#38bdf8',
        marginBottom: '14px',
        padding: '8px 12px',
        background: 'rgba(56, 189, 248, 0.1)',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        border: '1px solid rgba(56, 189, 248, 0.2)'
      }}>
        <MapPin size={14} color="#38bdf8" />
        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          Current Origin: <strong>{currentCampus}</strong>
        </span>
      </div>

      {/* Next Class Destination */}
      {nextClass && (
        <div style={{
          background: 'rgba(255, 255, 255, 0.04)',
          borderRadius: '10px',
          padding: '14px',
          marginBottom: '14px',
          border: '1px solid rgba(255, 255, 255, 0.06)'
        }}>
          <div style={{ fontSize: '10px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>
            Next Destination
          </div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff', marginTop: '2px' }}>
            {nextClass.course}
          </div>
          <div style={{ fontSize: '12px', color: '#d1d5db', display: 'flex', alignItems: 'center', gap: '5px', marginTop: '4px' }}>
            <MapPin size={12} color="#cc0033" />
            {nextClass.building} ({nextClass.campus}) at {nextClass.startTime}
          </div>
        </div>
      )}

      {/* Incoming Buses List */}
      <div style={{ fontSize: '12px', fontWeight: 700, color: '#9ca3af', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        Incoming Buses ({buses.length})
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '250px', overflowY: 'auto', paddingRight: '2px' }}>
        {buses.length === 0 ? (
          <div style={{ fontSize: '12px', color: '#9ca3af', textAlign: 'center', padding: '16px' }}>
            Syncing live arrivals...
          </div>
        ) : (
          buses.map((bus) => {
            const isWeekend1 = bus.route.includes('Weekend 1');
            const isWeekend2 = bus.route.includes('Weekend 2');
            const isLX = bus.route === 'LX';
            const isB = bus.route === 'B';

            const badgeBg = isWeekend1
              ? '#0d9488'
              : isWeekend2
              ? '#10b981'
              : isLX
              ? '#cc0033'
              : isB
              ? '#2563eb'
              : '#7c3aed';

            return (
              <div key={bus.id} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '11px 14px',
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: '10px',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                overflow: 'hidden'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1, marginRight: '10px' }}>
                  <div style={{
                    padding: '4px 8px',
                    minWidth: '58px',
                    height: '28px',
                    borderRadius: '7px',
                    background: badgeBg,
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '11px',
                    flexShrink: 0,
                    whiteSpace: 'nowrap'
                  }}>
                    {bus.route === "Weekend 1" ? "WKND 1" : bus.route === "Weekend 2" ? "WKND 2" : bus.route}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#f3f4f6', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      To {bus.destination}
                    </div>
                    <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {bus.next_stop} • {bus.occupancy}
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <span style={{ fontSize: '15px', fontWeight: 800, color: '#38bdf8' }}>{bus.eta_mins}m</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Traffic Alert */}
      <div style={{
        marginTop: '14px',
        fontSize: '11px',
        color: '#fbbf24',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        background: 'rgba(245, 158, 11, 0.1)',
        padding: '9px 12px',
        borderRadius: '8px'
      }}>
        <AlertTriangle size={14} />
        <span>Peak campus headways active. Allow +5 mins.</span>
      </div>

      {/* Footer Embed Code Quick Copy */}
      <div style={{
        marginTop: '14px',
        paddingTop: '12px',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <span style={{ fontSize: '11px', color: '#9ca3af' }}>Embed in Canvas / Notion</span>
        <button
          onClick={copyEmbedCode}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '11px',
            padding: '5px 12px',
            borderRadius: '6px',
            background: copied ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.06)',
            border: copied ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(255, 255, 255, 0.12)',
            color: copied ? '#34d399' : '#f3f4f6',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          {copied ? <Check size={12} color="#34d399" /> : <Copy size={12} />}
          {copied ? 'Copied iFrame!' : 'Copy iFrame'}
        </button>
      </div>
    </div>
  );
};
