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
      text: `Hey! I'm your Rutgers Transit Copilot. You're currently at ${currentCampus}. Ask me anything like: 'I need to get to Tillett Hall on Livingston for my 12:10 class—what bus should I take?'`
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
    <div className="glass-panel" style={{
      padding: '16px 18px',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      minHeight: 0,
      boxSizing: 'border-box',
      ...style
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <div style={{
          background: 'rgba(204, 0, 51, 0.2)',
          padding: '6px',
          borderRadius: '8px',
          color: '#ff4d6d'
        }}>
          <Sparkles size={16} />
        </div>
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#fff', margin: 0 }}>Ask ScarletHop Copilot</h3>
          <p style={{ fontSize: '11px', color: '#9ca3af', margin: 0 }}>Natural language routing & delay prediction</p>
        </div>
      </div>

      {/* Messages Feed */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        flex: '1 1 0',
        minHeight: 0,
        overflowY: 'auto',
        marginBottom: '12px',
        paddingRight: '4px'
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
      <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask e.g. 'How do I get to Busch Hill Center from The Yard?'"
          style={{
            flex: 1,
            padding: '10px 14px',
            borderRadius: '8px',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            color: '#fff',
            fontSize: '12px',
            outline: 'none'
          }}
        />
        <button
          onClick={handleSend}
          disabled={loading}
          style={{
            padding: '10px 16px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #cc0033 0%, #a00028 100%)',
            color: '#fff',
            fontWeight: 700,
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(204, 0, 51, 0.35)'
          }}
        >
          {loading ? "..." : "Send"} <Send size={13} />
        </button>
      </div>
    </div>
  );
};
