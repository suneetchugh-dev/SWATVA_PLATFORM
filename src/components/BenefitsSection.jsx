import React, { useState } from 'react';
import { api, getToken } from '../api/client';

export default function BenefitsSection() {
  const token = getToken();
  const [subTab, setSubTab] = useState('recommended'); // 'recommended', 'missed', 'life-event'

  // Recommended Benefits State
  const [recommended, setRecommended] = useState(null);
  const [loadingRec, setLoadingRec] = useState(false);
  const [errorRec, setErrorRec] = useState(null);

  // Missed Value State
  const [missed, setMissed] = useState(null);
  const [loadingMissed, setLoadingMissed] = useState(false);
  const [errorMissed, setErrorMissed] = useState(null);

  // Life Event State
  const [lifeEventText, setLifeEventText] = useState('My daughter has recently started college in Uttar Pradesh and our family income is below ₹2 lakh.');
  const [lifeEventResult, setLifeEventResult] = useState(null);
  const [loadingLifeEvent, setLoadingLifeEvent] = useState(false);
  const [errorLifeEvent, setErrorLifeEvent] = useState(null);

  const fetchRecommended = async () => {
    if (!token) return;
    setLoadingRec(true);
    setErrorRec(null);
    try {
      const data = await api.benefits.getRecommended();
      setRecommended(data);
    } catch (err) {
      setErrorRec(err);
    } finally {
      setLoadingRec(false);
    }
  };

  const fetchMissed = async () => {
    if (!token) return;
    setLoadingMissed(true);
    setErrorMissed(null);
    try {
      const data = await api.benefits.getMissedValue();
      setMissed(data);
    } catch (err) {
      setErrorMissed(err);
    } finally {
      setLoadingMissed(false);
    }
  };

  const handleLifeEventSubmit = async (e) => {
    e.preventDefault();
    setLoadingLifeEvent(true);
    setErrorLifeEvent(null);
    try {
      const data = await api.benefits.discoverLifeEvent(lifeEventText);
      setLifeEventResult(data);
    } catch (err) {
      setErrorLifeEvent(err);
    } finally {
      setLoadingLifeEvent(false);
    }
  };

  if (!token) {
    return (
      <div className="card">
        <div className="card-title">Personalized & Missed Benefits</div>
        <div className="alert alert-info">Please log in to discover personalized and potentially missed benefits.</div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-title">
        <span>Citizen Benefits & Discovery</span>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <button
          className={`btn btn-sm ${subTab === 'recommended' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => { setSubTab('recommended'); if (!recommended) fetchRecommended(); }}
        >
          Central + State Benefits
        </button>
        <button
          className={`btn btn-sm ${subTab === 'missed' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => { setSubTab('missed'); if (!missed) fetchMissed(); }}
        >
          Missed Value Calculator
        </button>
        <button
          className={`btn btn-sm ${subTab === 'life-event' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setSubTab('life-event')}
        >
          Life Event Discovery
        </button>
      </div>

      {/* Subtab 1: Recommended Central & State Benefits */}
      {subTab === 'recommended' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <p className="card-subtitle" style={{ margin: 0 }}>
              Separates eligible and potentially eligible schemes into Central and State government benefits.
            </p>
            <button className="btn btn-secondary btn-sm" onClick={fetchRecommended} disabled={loadingRec}>
              {loadingRec ? 'Loading...' : 'Refresh Recommended'}
            </button>
          </div>

          {errorRec && <div className="alert alert-danger">Error: {errorRec.message}</div>}

          {recommended && (
            <div>
              <div style={{ marginBottom: '16px', fontWeight: 600 }}>
                Total Potential Benefits Found: <span className="badge badge-blue">{recommended.totalPotentialBenefits}</span>
              </div>

              {/* Central Benefits */}
              <h4 style={{ color: 'var(--primary)', marginBottom: '8px' }}>
                Central Government Benefits ({recommended.centralBenefits?.length || 0})
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                {recommended.centralBenefits?.map((b) => (
                  <div key={b.schemeId} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '6px', padding: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <strong>{b.schemeName}</strong>
                      <span className="badge badge-green">{b.status}</span>
                    </div>
                    <p style={{ fontSize: '13px', marginTop: '4px' }}>{b.benefitInformation}</p>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Match: {b.matchPercentage}% | Category: {b.category} | Authority: {b.issuingAuthority}
                    </div>
                  </div>
                ))}
              </div>

              {/* State Benefits */}
              <h4 style={{ color: 'var(--success)', marginBottom: '8px' }}>
                State Government Benefits ({recommended.stateBenefits?.length || 0})
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {recommended.stateBenefits?.map((b) => (
                  <div key={b.schemeId} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '6px', padding: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <strong>{b.schemeName} ({b.state})</strong>
                      <span className="badge badge-green">{b.status}</span>
                    </div>
                    <p style={{ fontSize: '13px', marginTop: '4px' }}>{b.benefitInformation}</p>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Match: {b.matchPercentage}% | Category: {b.category} | Authority: {b.issuingAuthority}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Subtab 2: Missed Benefits Value */}
      {subTab === 'missed' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <p className="card-subtitle" style={{ margin: 0 }}>
              Calculates estimated monetary benefit from verified scheme data for potentially eligible but unclaimed schemes.
            </p>
            <button className="btn btn-secondary btn-sm" onClick={fetchMissed} disabled={loadingMissed}>
              {loadingMissed ? 'Calculating...' : 'Recalculate'}
            </button>
          </div>

          {errorMissed && <div className="alert alert-danger">Error: {errorMissed.message}</div>}

          {missed && (
            <div>
              <div className="alert alert-info" style={{ fontSize: '14px', fontWeight: 600 }}>
                {missed.message || `You may be missing benefits worth approximately ₹${missed.totalEstimatedAnnualBenefit?.toLocaleString()}/year.`}
              </div>

              <div className="grid-3" style={{ marginBottom: '16px' }}>
                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                  <label>Total Annual Estimated Benefit</label>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--primary)' }}>
                    ₹{missed.totalEstimatedAnnualBenefit?.toLocaleString()}
                  </div>
                </div>
                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                  <label>Central Government Share</label>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--primary)' }}>
                    ₹{missed.central?.toLocaleString()}
                  </div>
                </div>
                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                  <label>State Government Share</label>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--success)' }}>
                    ₹{missed.state?.toLocaleString()}
                  </div>
                </div>
              </div>

              <h4 style={{ marginBottom: '8px' }}>Per-Scheme Value Breakdown</h4>
              <div className="table-container" style={{ marginBottom: '14px' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Scheme Name</th>
                      <th>Level</th>
                      <th>Period</th>
                      <th>Estimated Amount</th>
                      <th>Benefit Detail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {missed.breakdown?.map((b) => (
                      <tr key={b.schemeId}>
                        <td><strong>{b.schemeName}</strong></td>
                        <td><span className="badge badge-gray">{b.governmentLevel}</span></td>
                        <td>{b.period}</td>
                        <td><strong>₹{b.estimatedBenefit?.toLocaleString()}</strong></td>
                        <td style={{ fontSize: '12px' }}>{b.benefitDescription}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="alert alert-warning" style={{ fontSize: '12px' }}>
                <strong>Disclaimer:</strong> {missed.disclaimer || 'This is an estimate based on verified public scheme guidelines, NOT a guaranteed financial payout. Actual disbursements depend on official scrutiny, verification, and government sanctions.'}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Subtab 3: Life Event Discovery */}
      {subTab === 'life-event' && (
        <div>
          <p className="card-subtitle">
            Describe a life situation in natural language. The LLM extracts structured signals (event, occupation, education, income, location), and the deterministic eligibility engine evaluates matches.
          </p>

          <form onSubmit={handleLifeEventSubmit} style={{ marginBottom: '16px' }}>
            <div className="form-group">
              <label>Life Event Situation Description</label>
              <textarea
                value={lifeEventText}
                onChange={(e) => setLifeEventText(e.target.value)}
                placeholder="e.g. My daughter has recently started college in UP and our family income is below ₹2 lakh."
                rows={3}
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loadingLifeEvent}>
              {loadingLifeEvent ? 'Analyzing Signals & Matching...' : 'Discover Benefits'}
            </button>
          </form>

          {errorLifeEvent && <div className="alert alert-danger">Error: {errorLifeEvent.message}</div>}

          {lifeEventResult && (
            <div>
              {/* Extracted signals */}
              {lifeEventResult.signals && (
                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '6px', marginBottom: '14px', border: '1px solid var(--border)' }}>
                  <strong>Extracted Life Event Signals:</strong>
                  <div className="grid-3" style={{ marginTop: '8px', fontSize: '12px' }}>
                    <div><strong>Event Type:</strong> {lifeEventResult.signals.eventType || 'N/A'}</div>
                    <div><strong>Affected Member:</strong> {lifeEventResult.signals.affectedMember || 'N/A'}</div>
                    <div><strong>Occupation:</strong> {lifeEventResult.signals.occupation || 'N/A'}</div>
                    <div><strong>Education:</strong> {lifeEventResult.signals.education || 'N/A'}</div>
                    <div><strong>Income:</strong> {lifeEventResult.signals.income ? `₹${lifeEventResult.signals.income}` : 'N/A'}</div>
                    <div><strong>Location:</strong> {lifeEventResult.signals.location || 'N/A'}</div>
                  </div>
                </div>
              )}

              {/* Surfaced Central Schemes */}
              <h4 style={{ color: 'var(--primary)', marginBottom: '8px' }}>
                Surfaced Central Schemes ({lifeEventResult.centralSchemes?.length || 0})
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                {lifeEventResult.centralSchemes?.map((m) => (
                  <div key={m.schemeId} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '6px', padding: '10px' }}>
                    <strong>{m.schemeName}</strong>
                    <p style={{ fontSize: '13px', marginTop: '2px' }}>{m.benefitInformation}</p>
                    <div style={{ fontSize: '12px', color: 'var(--primary)', marginTop: '4px' }}>
                      <strong>Why surfaced:</strong> {m.whySurfaced}
                    </div>
                  </div>
                ))}
              </div>

              {/* Surfaced State Schemes */}
              <h4 style={{ color: 'var(--success)', marginBottom: '8px' }}>
                Surfaced State Schemes ({lifeEventResult.stateSchemes?.length || 0})
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {lifeEventResult.stateSchemes?.map((m) => (
                  <div key={m.schemeId} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '6px', padding: '10px' }}>
                    <strong>{m.schemeName} ({m.state})</strong>
                    <p style={{ fontSize: '13px', marginTop: '2px' }}>{m.benefitInformation}</p>
                    <div style={{ fontSize: '12px', color: 'var(--success)', marginTop: '4px' }}>
                      <strong>Why surfaced:</strong> {m.whySurfaced}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
