import React, { useState } from 'react';
import { api, getToken } from '../api/client';

export default function ChatSection() {
  const token = getToken();
  const [messages, setMessages] = useState([
    { sender: 'bot', text: 'Namaste! I am SWATVA. How can I assist you with government schemes and citizen benefits today? (आप हिंदी या अंग्रेजी में पूछ सकते हैं)' }
  ]);
  const [input, setInput] = useState('');
  const [language, setLanguage] = useState('English');
  const [sessionId, setSessionId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userText = input.trim();
    setInput('');
    setMessages(prev => [...prev, { sender: 'user', text: userText }]);
    setLoading(true);
    setError(null);

    try {
      const res = await api.chat.send(userText, sessionId, language);
      if (res && res.sessionId) {
        setSessionId(res.sessionId);
      }
      setMessages(prev => [
        ...prev,
        {
          sender: 'bot',
          text: res.reply,
          surfacedBenefits: res.surfacedBenefits,
          activeScheme: res.activeSchemeName,
          readiness: res.readinessScore,
        }
      ]);
    } catch (err) {
      setError(err);
      setMessages(prev => [
        ...prev,
        { sender: 'bot', text: `Sorry, an error occurred: ${err.message}` }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <div className="card-title">
        <span>Conversational Assistant (Multilingual Chat)</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ margin: 0, fontSize: '12px' }}>Language:</label>
          <select
            style={{ width: 'auto', padding: '4px 8px' }}
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
          >
            <option value="English">English</option>
            <option value="Hindi">हिन्दी (Hindi)</option>
            <option value="Kannada">ಕನ್ನಡ (Kannada)</option>
          </select>
        </div>
      </div>

      <p className="card-subtitle">
        Interactive conversational interface connected directly to the user profile, deterministic eligibility engine, and Qdrant RAG.
      </p>

      {error && (
        <div className="alert alert-danger">
          <strong>Error ({error.code}):</strong> {error.message}
        </div>
      )}

      <div className="chat-window">
        <div className="chat-messages">
          {messages.map((m, idx) => (
            <div key={idx} className={`chat-bubble ${m.sender === 'user' ? 'chat-user' : 'chat-bot'}`}>
              <div style={{ whiteSpace: 'pre-wrap' }}>{m.text}</div>

              {/* Optional surfaced benefits */}
              {m.surfacedBenefits && m.surfacedBenefits.length > 0 && (
                <div style={{ marginTop: '8px', borderTop: '1px solid var(--border)', paddingTop: '6px' }}>
                  <strong style={{ fontSize: '12px' }}>Surfaced Benefits:</strong>
                  <ul style={{ paddingLeft: '16px', fontSize: '12px', marginTop: '2px' }}>
                    {m.surfacedBenefits.map((b, i) => (
                      <li key={i}><strong>{b.schemeName}</strong> ({b.governmentLevel}): {b.benefitInformation}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Optional readiness score */}
              {m.readiness && (
                <div style={{ marginTop: '6px', fontSize: '11px', color: 'var(--primary)' }}>
                  Readiness for {m.activeScheme}: <strong>{m.readiness.readinessPercentage}% ({m.readiness.status})</strong>
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="chat-bubble chat-bot" style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>
              SWATVA is thinking and retrieving verified facts...
            </div>
          )}
        </div>

        <form onSubmit={handleSend} className="chat-input-bar">
          <input
            type="text"
            placeholder={language === 'Hindi' ? 'सरकारी योजनाओं के बारे में पूछें...' : 'Ask about government schemes...'}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
          />
          <button type="submit" className="btn btn-primary" disabled={loading || !input.trim()}>
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
