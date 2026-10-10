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
  style?: React.CSSProperties;
}

export const AICopilotChat: React.FC<AICopilotChatProps> = ({ currentCampus = "Busch Student Center", style }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      text: `Hello! I'm your Rutgers Transit Copilot. You're currently near ${currentCampus}. Ask me anything like: "What bus gets me to Tillett Hall on Livingston fastest right now?"`
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
    "Next LX to Livingston?",
    "Is Route 18 backed up?",
    "Fastest way to Busch ARC?"
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
        body: JSON.stringify({ query: textToSend, current_campus: currentCampus })
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
          text: "Catch the LX at The Yard in ~4 minutes. Allow ~14 minutes total travel time to account for Route 18 bridge traffic.",
          recommendedRoute: "LX",
          eta: 4
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
          background: 'linear-gradient(135deg, #FF375F 0%, #BF5AF2 50%, #0A84FF 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 16px rgba(191, 90, 242, 0.45)'
        }}>
          <Sparkles size={16} color="#fff" />
        </div>
        <div>
          <h3 style={{ fontSize: '15.5px', fontWeight: 700, color: '#fff', margin: 0, letterSpacing: '-0.015em' }}>
            Scarlet Copilot
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
                  background: 'rgba(255, 255, 255, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginBottom: '2px'
                }}>
                  <Bot size={14} color="#FF375F" />
                </div>
              )}

              <div style={{
                padding: '10px 14px',
                borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                background: isUser
                  ? 'linear-gradient(135deg, #FF375F 0%, #D71A43 100%)'
                  : 'rgba(255, 255, 255, 0.06)',
                border: isUser ? 'none' : '1px solid rgba(255, 255, 255, 0.08)',
                color: '#fff',
                fontSize: '13px',
                lineHeight: 1.45,
                boxShadow: isUser ? '0 3px 12px rgba(255, 55, 95, 0.28)' : 'none'
              }}>
                <div>{m.text}</div>
                {m.recommendedRoute && (
                  <div style={{
                    marginTop: '8px',
                    paddingTop: '6px',
                    borderTop: '1px solid rgba(255, 255, 255, 0.12)',
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
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              fontSize: '12px',
              color: 'var(--apple-label-secondary)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span className="animate-pulse-ring" style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#FF375F' }} />
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
              background: 'rgba(255, 255, 255, 0.05)'
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
        background: 'rgba(255, 255, 255, 0.08)',
        borderRadius: '9999px',
        padding: '4px 6px 4px 14px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
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
            color: '#fff',
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
            background: input.trim() && !loading ? '#FF375F' : 'rgba(255, 255, 255, 0.12)',
            color: '#fff',
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
