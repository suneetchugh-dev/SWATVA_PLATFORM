import React, { useState, useEffect } from 'react';
import { api } from '../api/client';

export default function TransparencySection() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Form states for anonymous report
  const [department, setDepartment] = useState('Revenue Department');
  const [officeLocation, setOfficeLocation] = useState('Tehsil Office');
  const [district, setDistrict] = useState('Lucknow');
  const [state, setState] = useState('Uttar Pradesh');
  const [category, setCategory] = useState('UNAUTHORIZED_FEE');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState('');

  const fetchSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.transparency.getSummary('Uttar Pradesh');
      setSummary(data);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  const handleSubmitReport = async (e) => {
    e.preventDefault();
    if (!description.trim()) return;
    setSubmitting(true);
    setError(null);
    setSubmitSuccess('');

    try {
      const res = await api.transparency.submitReport({
        department,
        officeLocation,
        district,
        state,
        category,
        description,
      });
      setSubmitSuccess(`Report submitted anonymously! Notice: ${res.officialGrievanceNotice}`);
      setDescription('');
      fetchSummary();
    } catch (err) {
      setError(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      {/* Submit Anonymous Report Card */}
      <div className="card">
        <div className="card-title">
          <span>Submit Anonymous Corruption / Fee Report</span>
        </div>
        <p className="card-subtitle">
          Sahayak AI strictly strips all user IDs, names, emails, phones, and IP addresses. Reports are aggregated anonymously for citizen transparency.
        </p>

        {submitSuccess && <div className="alert alert-success">{submitSuccess}</div>}
        {error && <div className="alert alert-danger">Error: {error.message}</div>}

        <form onSubmit={handleSubmitReport}>
          <div className="grid-3">
            <div className="form-group">
              <label>State</label>
              <select value={state} onChange={(e) => setState(e.target.value)}>
                <option value="Uttar Pradesh">Uttar Pradesh</option>
                <option value="Karnataka">Karnataka</option>
                <option value="Delhi">Delhi</option>
                <option value="Maharashtra">Maharashtra</option>
              </select>
            </div>

            <div className="form-group">
              <label>District</label>
              <input
                type="text"
                required
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Department</label>
              <input
                type="text"
                required
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Office / Counter Location</label>
              <input
                type="text"
                required
                value={officeLocation}
                onChange={(e) => setOfficeLocation(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Report Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="UNAUTHORIZED_FEE">UNAUTHORIZED_FEE (Charged fee for free scheme)</option>
                <option value="BRIBE_DEMAND">BRIBE_DEMAND (Direct bribe requested)</option>
                <option value="MIDDLEMAN_EXPLOITATION">MIDDLEMAN_EXPLOITATION (Agent commission demand)</option>
                <option value="APPLICATION_DELAY">APPLICATION_DELAY (Unexplained prolonged delay)</option>
                <option value="DOCUMENT_REJECTION_WITHOUT_REASON">DOCUMENT_REJECTION_WITHOUT_REASON</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Incident Description * (Do NOT enter your name or phone)</label>
            <textarea
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. The clerk at the counter demanded ₹500 cash to process the old age pension form, stating it is the processing charge."
            />
          </div>

          <button type="submit" className="btn btn-danger" disabled={submitting}>
            {submitting ? 'Submitting Anonymously...' : 'Submit Anonymous Report'}
          </button>
        </form>
      </div>

      {/* Anonymized Aggregation Summary Card */}
      <div className="card">
        <div className="card-title">
          <span>Anonymized Transparency Summary</span>
          <button className="btn btn-secondary btn-sm" onClick={fetchSummary} disabled={loading}>
            {loading ? 'Refreshing...' : 'Refresh Summary'}
          </button>
        </div>

        {summary && (
          <div>
            <div className="alert alert-info" style={{ marginBottom: '14px' }}>
              <strong>Official Redress Portals:</strong> Central: <a href={summary.officialInformation?.centralGrievancePortal} target="_blank" rel="noreferrer">{summary.officialInformation?.centralGrievancePortal}</a>
              {summary.officialInformation?.stateGrievancePortals && (
                <span> | Uttar Pradesh: <a href={summary.officialInformation.stateGrievancePortals['Uttar Pradesh']} target="_blank" rel="noreferrer">{summary.officialInformation.stateGrievancePortals['Uttar Pradesh']}</a></span>
              )}
            </div>

            <div className="grid-3">
              <div>
                <h4 style={{ marginBottom: '8px' }}>Reports by District</h4>
                <div className="table-container">
                  <table>
                    <thead>
                      <tr><th>District</th><th>Count</th></tr>
                    </thead>
                    <tbody>
                      {summary.byDistrict?.length > 0 ? (
                        summary.byDistrict.map((d, i) => (
                          <tr key={i}><td>{d.district}</td><td><strong>{d.count}</strong></td></tr>
                        ))
                      ) : (
                        <tr><td colSpan={2} style={{ color: 'var(--text-muted)' }}>No reports recorded yet</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h4 style={{ marginBottom: '8px' }}>Reports by Department</h4>
                <div className="table-container">
                  <table>
                    <thead>
                      <tr><th>Department</th><th>Count</th></tr>
                    </thead>
                    <tbody>
                      {summary.byDepartment?.length > 0 ? (
                        summary.byDepartment.map((d, i) => (
                          <tr key={i}><td>{d.department}</td><td><strong>{d.count}</strong></td></tr>
                        ))
                      ) : (
                        <tr><td colSpan={2} style={{ color: 'var(--text-muted)' }}>No reports recorded yet</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h4 style={{ marginBottom: '8px' }}>Reports by Category</h4>
                <div className="table-container">
                  <table>
                    <thead>
                      <tr><th>Category</th><th>Count</th></tr>
                    </thead>
                    <tbody>
                      {summary.byCategory?.length > 0 ? (
                        summary.byCategory.map((d, i) => (
                          <tr key={i}><td>{d.category}</td><td><strong>{d.count}</strong></td></tr>
                        ))
                      ) : (
                        <tr><td colSpan={2} style={{ color: 'var(--text-muted)' }}>No reports recorded yet</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
