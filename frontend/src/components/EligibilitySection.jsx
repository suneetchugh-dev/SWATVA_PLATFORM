import React, { useState } from 'react';
import { api, getToken } from '../api/client';

export default function EligibilitySection() {
  const token = getToken();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // AI explanation state
  const [explainingId, setExplainingId] = useState(null);
  const [explanation, setExplanation] = useState({});

  const evaluateEligibility = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.eligibility.getMatches();
      setMatches(data || []);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const explainScheme = async (schemeId) => {
    setExplainingId(schemeId);
    try {
      const data = await api.ai.explainMatch(schemeId);
      setExplanation(prev => ({ ...prev, [schemeId]: data }));
    } catch (err) {
      setExplanation(prev => ({
        ...prev,
        [schemeId]: { explanation: `Error retrieving explanation: ${err.message}` }
      }));
    } finally {
      setExplainingId(null);
    }
  };

  if (!token) {
    return (
      <div className="card">
        <div className="card-title">Deterministic Eligibility Evaluation</div>
        <div className="alert alert-info">Please log in to evaluate eligibility for your recorded profile.</div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-title">
        <span>Deterministic Eligibility Evaluation</span>
        <button className="btn btn-primary btn-sm" onClick={evaluateEligibility} disabled={loading}>
          {loading ? 'Evaluating Eligibility...' : 'Evaluate My Eligibility'}
        </button>
      </div>

      <p className="card-subtitle">
        Evaluates machine-evaluable rules (age, income, occupation, education, gender, disability, state) against active Central schemes and State schemes for your recorded profile state.
      </p>

      {error && (
        <div className="alert alert-danger">
          <strong>Error ({error.code}):</strong> {error.message}
        </div>
      )}

      {loading && <p>Evaluating rules against active schemes in the database...</p>}

      {!loading && matches.length === 0 && !error && (
        <p style={{ color: 'var(--text-muted)' }}>
          Click "Evaluate My Eligibility" to run the deterministic evaluation engine.
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
        {matches.map((item) => {
          const statusBadge =
            item.status === 'ELIGIBLE' ? 'badge-green' :
            item.status === 'POTENTIALLY_ELIGIBLE' ? 'badge-yellow' : 'badge-red';

          const exp = explanation[item.schemeId];

          return (
            <div key={item.schemeId} className="card" style={{ margin: 0, border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: 600 }}>{item.scheme}</h3>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
                    <span className={`badge ${statusBadge}`}>{item.status}</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      Match Score: <strong>{item.matchPercentage}%</strong>
                    </span>
                  </div>
                </div>

                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => explainScheme(item.schemeId)}
                  disabled={explainingId === item.schemeId}
                >
                  {explainingId === item.schemeId ? 'Generating AI explanation...' : 'Explain Match (AI)'}
                </button>
              </div>

              {/* Conditions breakdown */}
              <div className="grid-3" style={{ marginTop: '14px', fontSize: '12px' }}>
                <div style={{ background: '#f0fdf4', padding: '10px', borderRadius: '6px' }}>
                  <strong style={{ color: '#166534' }}>✓ Satisfied Conditions ({item.satisfiedConditions?.length || 0})</strong>
                  <ul style={{ paddingLeft: '16px', marginTop: '4px' }}>
                    {item.satisfiedConditions && item.satisfiedConditions.length > 0 ? (
                      item.satisfiedConditions.map((c, i) => <li key={i}>{c}</li>)
                    ) : (
                      <li>None</li>
                    )}
                  </ul>
                </div>

                <div style={{ background: '#fef2f2', padding: '10px', borderRadius: '6px' }}>
                  <strong style={{ color: '#991b1b' }}>✗ Failed Conditions ({item.failedConditions?.length || 0})</strong>
                  <ul style={{ paddingLeft: '16px', marginTop: '4px' }}>
                    {item.failedConditions && item.failedConditions.length > 0 ? (
                      item.failedConditions.map((c, i) => <li key={i}>{c}</li>)
                    ) : (
                      <li>None</li>
                    )}
                  </ul>
                </div>

                <div style={{ background: '#fefce8', padding: '10px', borderRadius: '6px' }}>
                  <strong style={{ color: '#854d0e' }}>? Missing Profile Info ({item.missingInformation?.length || 0})</strong>
                  <ul style={{ paddingLeft: '16px', marginTop: '4px' }}>
                    {item.missingInformation && item.missingInformation.length > 0 ? (
                      item.missingInformation.map((c, i) => <li key={i}>{c}</li>)
                    ) : (
                      <li>None (Profile complete for this scheme)</li>
                    )}
                  </ul>
                </div>
              </div>

              {/* AI Explanation block */}
              {exp && (
                <div style={{ marginTop: '12px', background: 'var(--primary-light)', padding: '12px', borderRadius: '6px', border: '1px solid #bfdbfe' }}>
                  <strong style={{ color: 'var(--primary)' }}>AI Explanation (Grounded in Verified Facts):</strong>
                  <p style={{ marginTop: '4px', fontSize: '13px', whiteSpace: 'pre-wrap' }}>
                    {exp.explanation}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
