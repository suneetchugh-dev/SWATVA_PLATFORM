import React, { useState } from 'react';
import { api, getToken, getStoredUser } from '../api/client';

export default function AuthSection({ onAuthChange }) {
  const [mode, setMode] = useState('login'); // 'login' or 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  const currentUser = getStoredUser();
  const currentToken = getToken();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg('');

    try {
      if (mode === 'login') {
        const res = await api.auth.login(email, password);
        setSuccessMsg(`Logged in successfully as ${res.email}`);
      } else {
        const res = await api.auth.register(fullName, email, password);
        setSuccessMsg(`Registered and logged in as ${res.email}`);
      }
      if (onAuthChange) onAuthChange();
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    api.auth.logout();
    setSuccessMsg('Logged out successfully.');
    if (onAuthChange) onAuthChange();
  };

  return (
    <div className="card">
      <div className="card-title">
        <span>Authentication & Session</span>
        {currentUser && (
          <button className="btn btn-secondary btn-sm" onClick={handleLogout}>
            Logout
          </button>
        )}
      </div>

      {currentUser ? (
        <div>
          <div className="alert alert-success">
            <strong>Authenticated:</strong> {currentUser.email}
          </div>
          <div className="form-group">
            <label>Stored JWT Token (Bearer)</label>
            <pre className="code-view" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: '120px' }}>
              {currentToken}
            </pre>
          </div>
        </div>
      ) : (
        <div>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <button
              type="button"
              className={`btn btn-sm ${mode === 'login' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => { setMode('login'); setError(null); }}
            >
              Login
            </button>
            <button
              type="button"
              className={`btn btn-sm ${mode === 'register' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => { setMode('register'); setError(null); }}
            >
              Register New Account
            </button>
          </div>

          {error && (
            <div className="alert alert-danger">
              <strong>Error ({error.code || 'FAILED'}):</strong> {error.message}
              {error.fieldErrors && (
                <ul style={{ marginTop: '6px', paddingLeft: '20px' }}>
                  {Object.entries(error.fieldErrors).map(([field, msg]) => (
                    <li key={field}><strong>{field}:</strong> {msg}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {successMsg && <div className="alert alert-success">{successMsg}</div>}

          <form onSubmit={handleSubmit}>
            {mode === 'register' && (
              <div className="form-group">
                <label>Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
            )}

            <div className="form-group">
              <label>Email Address *</label>
              <input
                type="email"
                required
                placeholder="citizen@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Password * (Minimum 8 characters)</label>
              <input
                type="password"
                required
                minLength={8}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Submitting...' : mode === 'login' ? 'Log In' : 'Register & Log In'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
