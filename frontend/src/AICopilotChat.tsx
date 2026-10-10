import React, { useState } from 'react';
import { Sparkles, Send, Bot, User } from 'lucide-react';

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
      text: `Hey! I'm your Rutgers Transit Copilot. You're currently at ${currentCampus}. Ask me anything like: 'I need to get to Tillett Hall on Livingston for my 12:10 class—what bus should I take?'`,
      recommendedRoute: "B",
      eta: 4
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userText = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: 'user', text: userText }]);
    setLoading(true);

    try {
      const res = await fetch("http://localhost:8000/api/copilot/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: userText, current_campus: currentCampus })
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
          text: "Catch the LX at The Yard in ~4 minutes. Give yourself ~14 minutes total to account for Route 18 bridge traffic.",
          recommendedRoute: "LX",
          eta: 4
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
        <div style={{
          background: 'rgba(204, 0, 51, 0.2)',
          padding: '8px',
          borderRadius: '10px',
          color: '#ff4d6d'
        }}>
          <Sparkles size={20} />
        </div>
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>Ask ScarletHop Copilot</h3>
          <p style={{ fontSize: '12px', color: '#9ca3af' }}>Natural language routing, rush-hour delay prediction, and walking advice</p>
        </div>
      </div>

      {/* Messages Feed */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        flex: 1,
        minHeight: '380px',
        maxHeight: '560px',
        overflowY: 'auto',
        marginBottom: '16px',
        paddingRight: '6px'
      }}>
        {messages.map((m, idx) => (
          <div
            key={idx}
            style={{
              display: 'flex',
              gap: '10px',
              alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '85%'
            }}
          >
            {m.role === 'assistant' && (
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                background: 'rgba(204,0,51,0.25)',
                color: '#ff4d6d',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Bot size={16} />
              </div>
            )}

            <div style={{
              padding: '12px 16px',
              borderRadius: '12px',
              background: m.role === 'user' ? 'linear-gradient(135deg, #cc0033 0%, #800020 100%)' : 'rgba(255,255,255,0.03)',
              border: m.role === 'user' ? 'none' : '1px solid rgba(255,255,255,0.06)',
              color: '#fff',
              fontSize: '13px',
              lineHeight: 1.5
            }}>
              <div>{m.text}</div>
              {m.recommendedRoute && (
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginTop: '8px',
                  padding: '3px 8px',
                  background: 'rgba(255,255,255,0.06)',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#38bdf8'
                }}>
                  Recommended: Route {m.recommendedRoute} (in {m.eta} mins)
                </div>
              )}
            </div>

            {m.role === 'user' && (
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                background: 'rgba(255,255,255,0.1)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <User size={16} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Input Field */}
      <div style={{ display: 'flex', gap: '10px' }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask e.g. 'How do I get to Busch Hill Center from The Yard?'"
          style={{
            flex: 1,
            padding: '12px 16px',
            borderRadius: '10px',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            color: '#fff',
            fontSize: '13px',
            outline: 'none'
          }}
        />
        <button
          onClick={handleSend}
          disabled={loading}
          style={{
            padding: '12px 20px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #cc0033 0%, #a00028 100%)',
            color: '#fff',
            fontWeight: 700,
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          {loading ? "Thinking..." : "Send"} <Send size={14} />
        </button>
      </div>
    </div>
  );
};
