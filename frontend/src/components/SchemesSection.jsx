import React, { useState, useEffect } from 'react';
import { api } from '../api/client';

export default function SchemesSection({ onSelectSchemeForReadiness }) {
  const [schemes, setSchemes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Filters
  const [levelFilter, setLevelFilter] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [searchFilter, setSearchFilter] = useState('');

  // Selected scheme detail
  const [selectedScheme, setSelectedScheme] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);

  const fetchSchemes = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.schemes.list(levelFilter || null, stateFilter || null);
      setSchemes(data || []);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchemes();
  }, [levelFilter, stateFilter]);

  const viewSchemeDetails = async (id) => {
    setDetailLoading(true);
    setDetailError(null);
    try {
      const detail = await api.schemes.getById(id);
      setSelectedScheme(detail);
    } catch (err) {
      setDetailError(err);
    } finally {
      setDetailLoading(false);
    }
  };

  const filteredSchemes = schemes.filter(s => {
    if (!searchFilter.trim()) return true;
    const term = searchFilter.toLowerCase();
    return (
      (s.name && s.name.toLowerCase().includes(term)) ||
      (s.category && s.category.toLowerCase().includes(term)) ||
      (s.benefitInformation && s.benefitInformation.toLowerCase().includes(term))
    );
  });

  return (
    <div>
      <div className="card">
        <div className="card-title">
          <span>Government Schemes Catalogue ({filteredSchemes.length} found)</span>
          <button className="btn btn-secondary btn-sm" onClick={fetchSchemes} disabled={loading}>
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        {/* Filter controls */}
        <div className="grid-3" style={{ marginBottom: '16px' }}>
          <div>
            <label>Government Level</label>
            <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)}>
              <option value="">All Levels</option>
              <option value="CENTRAL">CENTRAL</option>
              <option value="STATE">STATE</option>
            </select>
          </div>
          <div>
            <label>State Filter</label>
            <select value={stateFilter} onChange={(e) => setStateFilter(e.target.value)}>
              <option value="">All States</option>
              <option value="Uttar Pradesh">Uttar Pradesh</option>
              <option value="Karnataka">Karnataka</option>
            </select>
          </div>
          <div>
            <label>Keyword Search</label>
            <input
              type="text"
              placeholder="Search by name, trade, category..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
            />
          </div>
        </div>

        {error && (
          <div className="alert alert-danger">
            <strong>Error ({error.code}):</strong> {error.message}
          </div>
        )}

        {loading ? (
          <p>Loading schemes from real PostgreSQL database...</p>
        ) : filteredSchemes.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>No schemes found matching the filters.</p>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Scheme Name</th>
                  <th>Level</th>
                  <th>State</th>
                  <th>Category</th>
                  <th>Benefit Summary</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSchemes.map((s) => (
                  <tr key={s.id}>
                    <td><strong>{s.name}</strong></td>
                    <td>
                      <span className={`badge ${s.governmentLevel === 'CENTRAL' ? 'badge-blue' : 'badge-green'}`}>
                        {s.governmentLevel}
                      </span>
                    </td>
                    <td>{s.state || 'All India'}</td>
                    <td>{s.category}</td>
                    <td style={{ maxWidth: '300px' }}>{s.benefitInformation}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => viewSchemeDetails(s.id)}
                        >
                          Details
                        </button>
                        {onSelectSchemeForReadiness && (
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => onSelectSchemeForReadiness(s)}
                          >
                            Check Readiness
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Selected Scheme Detail Modal / Card */}
      {selectedScheme && (
        <div className="card" style={{ borderColor: 'var(--primary)' }}>
          <div className="card-title">
            <span>Scheme Details: {selectedScheme.scheme.name}</span>
            <button className="btn btn-secondary btn-sm" onClick={() => setSelectedScheme(null)}>
              Close Detail
            </button>
          </div>

          <div className="grid-2" style={{ marginBottom: '16px' }}>
            <div>
              <p><strong>Government Level:</strong> {selectedScheme.scheme.governmentLevel}</p>
              <p><strong>State:</strong> {selectedScheme.scheme.state || 'All India'}</p>
              <p><strong>Category:</strong> {selectedScheme.scheme.category}</p>
              <p><strong>Issuing Authority:</strong> {selectedScheme.scheme.issuingAuthority}</p>
            </div>
            <div>
              <p><strong>Official Source Portal:</strong>{' '}
                <a href={selectedScheme.scheme.officialSourceUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', fontWeight: 600 }}>
                  {selectedScheme.scheme.officialSourceUrl}
                </a>
              </p>
              <p><strong>Last Verified:</strong> {new Date(selectedScheme.scheme.lastVerifiedAt).toLocaleDateString()}</p>
              {selectedScheme.scheme.officialGrievanceUrl && (
                <p><strong>Official Grievance Portal:</strong>{' '}
                  <a href={selectedScheme.scheme.officialGrievanceUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)' }}>
                    {selectedScheme.scheme.officialGrievanceUrl}
                  </a>
                </p>
              )}
            </div>
          </div>

          <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '6px', marginBottom: '16px' }}>
            <strong>Benefit Information:</strong>
            <p style={{ marginTop: '4px' }}>{selectedScheme.scheme.benefitInformation}</p>
          </div>

          {/* Transparency alert */}
          {selectedScheme.transparency && (
            <div className={`alert ${selectedScheme.transparency.officialApplicationFeeExists ? 'alert-info' : 'alert-success'}`}>
              <strong>Transparency Notice:</strong> {selectedScheme.transparency.transparencyWarning}
              {selectedScheme.transparency.officialApplicationChannel && (
                <div style={{ marginTop: '4px', fontSize: '12px' }}>
                  <strong>Authorized Application Channel:</strong> {selectedScheme.transparency.officialApplicationChannel}
                </div>
              )}
            </div>
          )}

          {/* Eligibility Criteria */}
          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ marginBottom: '8px' }}>Eligibility Criteria & Rules</h4>
            {selectedScheme.eligibilityCriteria && selectedScheme.eligibilityCriteria.length > 0 ? (
              <ul style={{ paddingLeft: '20px' }}>
                {selectedScheme.eligibilityCriteria.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            ) : (
              <p style={{ color: 'var(--text-muted)' }}>No explicit criteria listed.</p>
            )}
          </div>

          {/* Required Documents */}
          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ marginBottom: '8px' }}>Required Documents</h4>
            {selectedScheme.requiredDocuments && selectedScheme.requiredDocuments.length > 0 ? (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Document Code</th>
                      <th>Document Name</th>
                      <th>Mandatory</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedScheme.requiredDocuments.map((doc, idx) => (
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
            ) : (
              <p style={{ color: 'var(--text-muted)' }}>No specific documents specified.</p>
            )}
          </div>

          {/* Application Steps */}
          <div>
            <h4 style={{ marginBottom: '8px' }}>Application Steps</h4>
            {selectedScheme.applicationSteps && selectedScheme.applicationSteps.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {selectedScheme.applicationSteps.map((step, idx) => (
                  <div key={idx} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '6px', padding: '10px' }}>
                    <strong>Step {step.number || idx + 1}: {step.title}</strong>
                    <p style={{ marginTop: '4px' }}>{step.instructions}</p>
                    {step.officialUrl && (
                      <a href={step.officialUrl} target="_blank" rel="noreferrer" style={{ fontSize: '12px', color: 'var(--primary)' }}>
                        Portal Link: {step.officialUrl}
                      </a>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)' }}>Refer to the official source URL for steps.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
