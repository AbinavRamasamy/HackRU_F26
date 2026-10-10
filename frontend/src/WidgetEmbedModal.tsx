import React, { useState } from 'react';
import { Copy, Check, Code } from 'lucide-react';

export const WidgetEmbedModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'scarlet'>('scarlet');

  if (!isOpen) return null;

  const embedCode = `<iframe 
  src="${window.location.origin}?widget=only&theme=${theme}" 
  width="380" 
  height="480" 
  style="border: none; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.4);"
  title="ScarletHop Rutgers Transit Widget">
</iframe>`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      padding: '20px'
    }}>
      <div className="glass-panel" style={{
        maxWidth: '560px',
        width: '100%',
        padding: '28px',
        border: '1px solid rgba(204, 0, 51, 0.4)',
        boxShadow: '0 20px 50px rgba(0,0,0,0.6)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: 'rgba(204,0,51,0.2)', padding: '8px', borderRadius: '10px', color: '#ff4d6d' }}>
              <Code size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#fff' }}>Embed Transit Widget</h3>
              <p style={{ fontSize: '12px', color: '#9ca3af' }}>Embed in Canvas, student portals, or personal dashboards</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            style={{ background: 'transparent', color: '#9ca3af', fontSize: '20px', fontWeight: 700 }}
          >
            ✕
          </button>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '6px' }}>Theme Accent</label>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => setTheme('scarlet')}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '8px',
                background: theme === 'scarlet' ? 'rgba(204,0,51,0.25)' : 'rgba(255,255,255,0.03)',
                border: theme === 'scarlet' ? '1px solid #cc0033' : '1px solid rgba(255,255,255,0.08)',
                color: theme === 'scarlet' ? '#ff4d6d' : '#9ca3af',
                fontSize: '12px',
                fontWeight: 700
              }}
            >
              Scarlet Night (Default)
            </button>
            <button
              onClick={() => setTheme('dark')}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '8px',
                background: theme === 'dark' ? 'rgba(59,130,246,0.25)' : 'rgba(255,255,255,0.03)',
                border: theme === 'dark' ? '1px solid #3b82f6' : '1px solid rgba(255,255,255,0.08)',
                color: theme === 'dark' ? '#60a5fa' : '#9ca3af',
                fontSize: '12px',
                fontWeight: 700
              }}
            >
              Obsidian Dark
            </button>
          </div>
        </div>

        <div style={{
          background: 'rgba(0,0,0,0.4)',
          borderRadius: '10px',
          padding: '14px',
          border: '1px solid rgba(255,255,255,0.06)',
          fontFamily: 'monospace',
          fontSize: '12px',
          color: '#34d399',
          lineHeight: 1.5,
          position: 'relative',
          marginBottom: '20px',
          overflowX: 'auto'
        }}>
          {embedCode}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 18px',
              borderRadius: '8px',
              background: 'rgba(255,255,255,0.05)',
              color: '#9ca3af',
              fontSize: '13px',
              fontWeight: 600
            }}
          >
            Cancel
          </button>
          <button
            onClick={copyToClipboard}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              background: copied ? '#10b981' : 'linear-gradient(135deg, #cc0033 0%, #a00028 100%)',
              color: '#fff',
              fontSize: '13px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 14px rgba(204, 0, 51, 0.4)'
            }}
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? "Copied Snippet!" : "Copy Embed Code"}
          </button>
        </div>
      </div>
    </div>
  );
};
