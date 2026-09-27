import React, { useState, useEffect } from 'react';
import { api, getToken } from '../api/client';

export default function ChecklistAndReadinessSection({ initialSchemeId }) {
  const token = getToken();
  const [schemes, setSchemes] = useState([]);
  const [selectedSchemeId, setSelectedSchemeId] = useState(initialSchemeId || '');

  // Data states
  const [checklist, setChecklist] = useState(null);
  const [readiness, setReadiness] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load scheme list for dropdown
  useEffect(() => {
    api.schemes.list().then(data => {
      setSchemes(data || []);
      if (!selectedSchemeId && data && data.length > 0) {
        setSelectedSchemeId(data[0].id);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (initialSchemeId) {
      setSelectedSchemeId(initialSchemeId);
    }
  }, [initialSchemeId]);

  const loadData = async (schemeId) => {
    if (!schemeId) return;
    setLoading(true);
    setError(null);
    try {
      const [chk, red] = await Promise.all([
        api.schemes.getChecklist(schemeId),
        token ? api.readiness.getSchemeReadiness(schemeId) : null,
      ]);
      setChecklist(chk);
      setReadiness(red);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedSchemeId) {
      loadData(selectedSchemeId);
    }
  }, [selectedSchemeId]);

  return (
    <div className="card">
      <div className="card-title">
        <span>Action Checklist & Application Readiness Score</span>
      </div>
      <p className="card-subtitle">
        Calculates document readiness strictly based on required scheme documents cross-referenced against your Document Locker.
      </p>

      {/* Scheme Selector */}
      <div className="form-group" style={{ maxWidth: '400px', marginBottom: '16px' }}>
        <label>Select Scheme</label>
        <select
          value={selectedSchemeId}
          onChange={(e) => setSelectedSchemeId(e.target.value)}
        >
          <option value="">-- Choose a scheme --</option>
          {schemes.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.governmentLevel})
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="alert alert-danger">
          <strong>Error ({error.code}):</strong> {error.message}
        </div>
      )}

      {loading && <p>Evaluating document locker and calculating readiness score...</p>}

      {/* Readiness Score Card */}
      {readiness && (
        <div className="card" style={{ background: '#FAFAFA', marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 600 }}>{readiness.schemeName} — Readiness</h3>
              <div style={{ marginTop: '6px' }}>
                <span className={`traffic-indicator ${
                  readiness.status === 'GREEN' ? 'traffic-green' :
                  readiness.status === 'YELLOW' ? 'traffic-yellow' : 'traffic-red'
                }`}>
                  <span className="traffic-dot"></span>
                  Status: {readiness.status} ({readiness.readinessPercentage}%)
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', fontSize: '13px' }}>
              <div>Total Required: <strong>{readiness.totalRequiredDocuments}</strong></div>
              <div style={{ color: 'var(--success)' }}>Completed: <strong>{readiness.completedDocuments}</strong></div>
              <div style={{ color: 'var(--danger)' }}>Missing: <strong>{readiness.missingDocuments}</strong></div>
              <div style={{ color: 'var(--warning)' }}>Needing Review: <strong>{readiness.documentsNeedingReview}</strong></div>
            </div>
          </div>

          {/* Breakdown lists */}
          <div className="grid-3" style={{ marginTop: '16px', fontSize: '12px' }}>
            <div style={{ background: '#fff', border: '1px solid #E5E5E5', borderRadius: '6px', padding: '10px' }}>
              <strong style={{ color: '#525252' }}>✓ Completed ({readiness.completed?.length || 0})</strong>
              <ul style={{ paddingLeft: '16px', marginTop: '4px' }}>
                {readiness.completed?.map((d, i) => (
                  <li key={i}>{d.documentName || d.documentTypeCode}</li>
                ))}
              </ul>
            </div>

            <div style={{ background: '#fff', border: '1px solid #FDE68A', borderRadius: '6px', padding: '10px' }}>
              <strong style={{ color: '#B45309' }}>✗ Missing ({readiness.missing?.length || 0})</strong>
              <ul style={{ paddingLeft: '16px', marginTop: '4px' }}>
                {readiness.missing?.map((d, i) => (
                  <li key={i}>{d.documentName || d.documentTypeCode}</li>
                ))}
              </ul>
            </div>

            <div style={{ background: '#fff', border: '1px solid #fef08a', borderRadius: '6px', padding: '10px' }}>
              <strong style={{ color: '#ca8a04' }}>? Needs Review ({readiness.needsReview?.length || 0})</strong>
              <ul style={{ paddingLeft: '16px', marginTop: '4px' }}>
                {readiness.needsReview?.map((d, i) => (
                  <li key={i}>{d.documentName || d.documentTypeCode}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Action Checklist */}
      {checklist && (
        <div>
          <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '12px' }}>
            Action Checklist: {checklist.schemeName}
          </h3>

          {/* Application Channel and Portal Link */}
          <div style={{ background: '#FAFAFA', padding: '12px', borderRadius: '6px', marginBottom: '16px' }}>
            <div><strong>Where to Apply:</strong> {checklist.whereToApply || 'Official Portal'}</div>
            {checklist.officialApplicationUrl && (
              <div style={{ marginTop: '4px' }}>
                <strong>Official Portal Link:</strong>{' '}
                <a href={checklist.officialApplicationUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)' }}>
                  {checklist.officialApplicationUrl}
                </a>
              </div>
            )}
          </div>

          {/* Checklist Documents */}
          <h4 style={{ marginBottom: '8px' }}>Document Checklist</h4>
          <div className="table-container" style={{ marginBottom: '16px' }}>
            <table>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Document Name</th>
                  <th>Mandatory</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {checklist.requiredDocuments?.map((doc, idx) => (
                  <tr key={idx}>
                    <td><code>{doc.code}</code></td>
                    <td>{doc.name}</td>
                    <td>{doc.required ? <span className="badge badge-red">Yes</span> : 'Optional'}</td>
                    <td>{doc.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Steps */}
          <h4 style={{ marginBottom: '8px' }}>Step-by-Step Instructions</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
            {checklist.steps?.map((step, idx) => (
              <div key={idx} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '6px', padding: '10px' }}>
                <strong>Step {step.stepNumber}: {step.title}</strong>
                <p style={{ marginTop: '4px', fontSize: '13px' }}>{step.instructions}</p>
                {step.officialUrl && (
                  <a href={step.officialUrl} target="_blank" rel="noreferrer" style={{ fontSize: '12px', color: 'var(--primary)' }}>
                    Portal Link: {step.officialUrl}
                  </a>
                )}
              </div>
            ))}
          </div>

          {/* Missing Profile Information alert */}
          {checklist.missingProfileInformation && checklist.missingProfileInformation.length > 0 && (
            <div className="alert alert-warning">
              <strong>Missing Profile Information for complete eligibility verification:</strong>
              <ul style={{ paddingLeft: '20px', marginTop: '4px' }}>
                {checklist.missingProfileInformation.map((info, idx) => (
                  <li key={idx}>{info}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
