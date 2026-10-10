import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, MapPin, Copy, Check } from 'lucide-react';
import { getRouteColor } from './CampusRadar';

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

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (overlayRef.current && overlayRef.current.contains(target)) return;
      if (triggerRef?.current && triggerRef.current.contains(target)) return;
      onClose();
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose, triggerRef]);

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
    const code = `<iframe src="${window.location.origin}?widget=only" width="380" height="480" style="border:none;border-radius:18px;box-shadow:0 12px 36px rgba(0,0,0,0.4);" title="ScarletHop Transit Widget"></iframe>`;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      ref={overlayRef}
      style={{
        position: 'absolute',
        top: 'calc(100% + 10px)',
        right: 0,
        width: '380px',
        maxWidth: 'calc(100vw - 32px)',
        zIndex: 9999,
        background: 'rgba(28, 28, 30, 0.94)',
        backdropFilter: 'blur(32px) saturate(190%)',
        WebkitBackdropFilter: 'blur(32px) saturate(190%)',
        borderRadius: '20px',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.05)',
        padding: '18px',
        animation: 'fadeIn 0.2s ease-in-out'
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #FF375F 0%, #D71A43 100%)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Sparkles size={15} />
          </div>
          <div>
            <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#fff', margin: 0, letterSpacing: '-0.015em' }}>
              Transit Glance
            </h4>
            <span style={{ fontSize: '11px', color: '#30D158', fontWeight: 600 }}>● Live Telemetry</span>
          </div>
        </div>
      </div>

      {/* Departing Location Pill */}
      <div style={{
        fontSize: '11.5px',
        color: '#fff',
        marginBottom: '12px',
        padding: '7px 10px',
        background: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '10px',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        border: '1px solid rgba(255, 255, 255, 0.08)'
      }}>
        <MapPin size={13} color="#FF375F" />
        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          Origin: <strong>{currentCampus}</strong>
        </span>
      </div>

      {/* Next Class Destination */}
      {nextClass && (
        <div style={{
          background: 'rgba(255, 55, 95, 0.08)',
          borderRadius: '12px',
          padding: '10px 12px',
          marginBottom: '12px',
          border: '1px solid rgba(255, 55, 95, 0.25)'
        }}>
          <div style={{ fontSize: '10px', color: '#FF375F', textTransform: 'uppercase', letterSpacing: '0.4px', fontWeight: 700 }}>
            Next Destination
          </div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff', marginTop: '1px' }}>
            {nextClass.course}
          </div>
          <div style={{ fontSize: '11.5px', color: 'rgba(235, 235, 245, 0.65)', marginTop: '2px' }}>
            {nextClass.building} ({nextClass.campus}) at {nextClass.startTime}
          </div>
        </div>
      )}

      {/* Incoming Buses List */}
      <div style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(235, 235, 245, 0.6)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
        Arriving Soon ({buses.length})
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto', paddingRight: '2px' }}>
        {buses.length === 0 ? (
          <div style={{ fontSize: '11.5px', color: 'rgba(235, 235, 245, 0.5)', textAlign: 'center', padding: '14px' }}>
            Syncing live arrivals...
          </div>
        ) : (
          buses.map((bus) => (
            <div key={bus.id} style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 10px',
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: '10px',
              border: '1px solid rgba(255, 255, 255, 0.06)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1, marginRight: '8px' }}>
                <div style={{
                  padding: '3px 7px',
                  minWidth: '40px',
                  height: '24px',
                  borderRadius: '6px',
                  background: getRouteColor(bus.route),
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '10px',
                  flexShrink: 0
                }}>
                  {bus.route === "Weekend 1" ? "WKND 1" : bus.route === "Weekend 2" ? "WKND 2" : bus.route}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    To {bus.destination}
                  </div>
                  <div style={{ fontSize: '10.5px', color: 'rgba(235, 235, 245, 0.6)', marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {bus.next_stop} • {bus.occupancy}
                  </div>
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>{bus.eta_mins}m</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer Embed Code Quick Copy */}
      <div style={{
        marginTop: '12px',
        paddingTop: '10px',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <span style={{ fontSize: '11px', color: 'rgba(235, 235, 245, 0.6)' }}>Embed in Canvas</span>
        <button
          onClick={copyEmbedCode}
          className="apple-btn-secondary"
          style={{ fontSize: '11px', padding: '4px 10px', gap: '4px' }}
        >
          {copied ? <Check size={11} color="#30D158" /> : <Copy size={11} />}
          {copied ? 'Copied iFrame' : 'Copy iFrame'}
        </button>
      </div>
    </div>
  );
};
