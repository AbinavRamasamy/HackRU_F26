import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, ArrowUp, Bot } from 'lucide-react';

interface Message {
  role: 'assistant' | 'user';
  text: string;
  recommendedRoute?: string;
  eta?: number;
}

interface AICopilotChatProps {
  currentCampus?: string;
  currentLocation?: string;
  userCoords?: [number, number];
  style?: React.CSSProperties;
}

export const AICopilotChat: React.FC<AICopilotChatProps> = ({
  currentCampus = "Busch Student Center",
  currentLocation,
  userCoords,
  style
}) => {
  const effectiveLocation = currentLocation || currentCampus;
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      text: `Hello! I'm your Rutgers Transit Copilot. You're currently near ${effectiveLocation}. Ask me anything like: "What bus gets me to Tillett Hall on Livingston fastest right now?"`
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const quickPrompts = [
    "Next bus to Livingston?",
    "Is Route 18 backed up?",
    "Fastest way to Cook/Douglass?"
  ];

  const handleSend = async (queryText?: string) => {
    const textToSend = (queryText || input).trim();
    if (!textToSend || loading) return;

    setInput("");
    setMessages(prev => [...prev, { role: 'user', text: textToSend }]);
    setLoading(true);

    try {
      const res = await fetch("http://localhost:8000/api/copilot/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: textToSend,
          current_campus: currentCampus,
          current_location: effectiveLocation,
          coords: userCoords
        })
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            text: data.reply,
            recommendedRoute: data.recommended_route,
            eta: data.eta_mins
          }
        ]);
      } else {
        throw new Error();
      }
    } catch {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          text: "Unable to connect to the live transit intelligence server. Please check your connection or consult the live bus radar below."
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

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
      {/* Siri / Apple Intelligence Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px', flexShrink: 0 }}>
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--apple-accent) 0%, #BF5AF2 50%, var(--apple-blue) 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 16px var(--apple-accent-glow)'
        }}>
          <Sparkles size={16} color="#fff" />
        </div>
        <div>
          <h3 style={{ fontSize: '15.5px', fontWeight: 700, color: 'var(--apple-label-primary)', margin: 0, letterSpacing: '-0.015em' }}>
            Transit Copilot
          </h3>
          <p style={{ fontSize: '11px', color: 'var(--apple-label-secondary)', margin: 0 }}>
            Natural language transit routing & delay prediction
          </p>
        </div>
      </div>

      {/* Messages Feed */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        flex: '1 1 0',
        minHeight: 0,
        overflowY: 'auto',
        marginBottom: '12px',
        paddingRight: '4px'
      }}>
        {messages.map((m, idx) => {
          const isUser = m.role === 'user';
          return (
            <div
              key={idx}
              style={{
                display: 'flex',
                gap: '8px',
                alignSelf: isUser ? 'flex-end' : 'flex-start',
                maxWidth: '88%',
                alignItems: 'flex-end'
              }}
            >
              {!isUser && (
                <div style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  background: 'var(--apple-accent-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginBottom: '2px'
                }}>
                  <Bot size={14} color="var(--apple-accent)" />
                </div>
              )}

              <div style={{
                padding: '10px 14px',
                borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                background: isUser
                  ? 'linear-gradient(135deg, var(--apple-accent) 0%, var(--apple-accent-dark) 100%)'
                  : 'var(--apple-card-bg)',
                border: isUser ? 'none' : '1px solid var(--apple-border)',
                color: isUser ? '#fff' : 'var(--apple-label-primary)',
                fontSize: '13px',
                lineHeight: 1.45,
                boxShadow: isUser ? '0 3px 12px var(--apple-accent-glow)' : 'var(--apple-shadow-sm)'
              }}>
                <div>{m.text}</div>
                {m.recommendedRoute && (
                  <div style={{
                    marginTop: '8px',
                    paddingTop: '6px',
                    borderTop: '1px solid var(--apple-border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '11px',
                    fontWeight: 600
                  }}>
                    <span style={{
                      padding: '2px 6px',
                      borderRadius: '5px',
                      background: '#FF5722',
                      color: '#fff'
                    }}>
                      Route {m.recommendedRoute}
                    </span>
                    {m.eta && <span style={{ color: '#30D158' }}>Arriving ~{m.eta}m</span>}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', alignSelf: 'flex-start' }}>
            <div style={{
              padding: '10px 14px',
              borderRadius: '18px',
              background: 'var(--apple-card-bg)',
              border: '1px solid var(--apple-border)',
              fontSize: '12px',
              color: 'var(--apple-label-secondary)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span className="animate-pulse-ring" style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--apple-accent)' }} />
              Thinking...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Apple Siri Quick Suggestions */}
      <div style={{
        display: 'flex',
        gap: '6px',
        overflowX: 'auto',
        paddingBottom: '8px',
        flexShrink: 0
      }}>
        {quickPrompts.map((prompt, i) => (
          <button
            key={i}
            onClick={() => handleSend(prompt)}
            className="apple-btn-secondary"
            style={{
              padding: '4px 10px',
              fontSize: '11.5px',
              whiteSpace: 'nowrap',
              borderRadius: '9999px',
              background: 'var(--apple-btn-secondary-bg)',
              border: '1px solid var(--apple-border-subtle)',
              color: 'var(--apple-label-primary)'
            }}
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Apple Messages Style Capsule Input */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        background: 'var(--apple-input-bg)',
        borderRadius: '9999px',
        padding: '4px 6px 4px 14px',
        border: '1px solid var(--apple-border)',
        flexShrink: 0
      }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask Copilot about transit..."
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            color: 'var(--apple-label-primary)',
            fontSize: '13px',
            outline: 'none'
          }}
        />
        <button
          onClick={() => handleSend()}
          disabled={!input.trim() || loading}
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            background: input.trim() && !loading ? 'var(--apple-accent)' : 'var(--apple-btn-secondary-bg)',
            color: input.trim() && !loading ? '#fff' : 'var(--apple-label-tertiary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: input.trim() && !loading ? 'pointer' : 'default',
            transition: 'all 0.2s ease'
          }}
        >
          <ArrowUp size={15} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
};
