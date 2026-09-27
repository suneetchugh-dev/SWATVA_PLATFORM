import React, { useState, useEffect } from 'react';
import { api, getToken } from '../api/client';

export default function DocumentsSection() {
  const token = getToken();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  // Upload Form states
  const [docType, setDocType] = useState('INCOME_CERTIFICATE');
  const [selectedFile, setSelectedFile] = useState(null);
  const [issueDate, setIssueDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [authority, setAuthority] = useState('');

  // Validation response modal/state
  const [validationResult, setValidationResult] = useState(null);
  const [validatingId, setValidatingId] = useState(null);

  // Edit / Manual correction modal
  const [editingDoc, setEditingDoc] = useState(null);

  const fetchDocuments = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.documents.list();
      setDocuments(data || []);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [token]);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!token) return;
    setUploading(true);
    setError(null);
    setSuccessMsg('');

    try {
      if (selectedFile) {
        // Multipart upload
        const formData = new FormData();
        formData.append('documentType', docType);
        formData.append('file', selectedFile);
        if (issueDate) formData.append('issueDate', issueDate);
        if (expiryDate) formData.append('expiryDate', expiryDate);
        if (authority) formData.append('issuingAuthority', authority);

        await api.documents.upload(formData);
        setSuccessMsg(`Document "${selectedFile.name}" uploaded successfully!`);
      } else {
        // JSON metadata registration fallback
        await api.documents.register({
          documentType: docType,
          filename: `${docType.toLowerCase()}_sample.pdf`,
          issueDate: issueDate || null,
          expiryDate: expiryDate || null,
          issuingAuthority: authority || null,
        });
        setSuccessMsg(`Document type "${docType}" registered in Document Locker!`);
      }

      // Reset form & reload
      setSelectedFile(null);
      setIssueDate('');
      setExpiryDate('');
      setAuthority('');
      fetchDocuments();
    } catch (err) {
      setError(err);
    } finally {
      setUploading(false);
    }
  };

  const handleValidate = async (id) => {
    setValidatingId(id);
    try {
      const res = await api.documents.validate(id);
      setValidationResult({ id, ...res });
    } catch (err) {
      alert(`Validation error: ${err.message}`);
    } finally {
      setValidatingId(null);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this document from your locker?')) return;
    try {
      await api.documents.delete(id);
      setSuccessMsg('Document deleted successfully.');
      fetchDocuments();
    } catch (err) {
      setError(err);
    }
  };

  const handleCorrectionSubmit = async (e) => {
    e.preventDefault();
    if (!editingDoc) return;
    try {
      await api.documents.correct(editingDoc.id, {
        documentType: editingDoc.documentType,
        issueDate: editingDoc.issueDate || null,
        expiryDate: editingDoc.expiryDate || null,
        issuingAuthority: editingDoc.issuingAuthority || null,
        holderName: editingDoc.holderName || null,
      });
      setEditingDoc(null);
      setSuccessMsg('Document metadata corrected successfully!');
      fetchDocuments();
    } catch (err) {
      setError(err);
    }
  };

  if (!token) {
    return (
      <div className="card">
        <div className="card-title">Document Locker & Validity Checker</div>
        <div className="alert alert-info">Please log in to manage and validate documents in your Document Locker.</div>
      </div>
    );
  }

  return (
    <div>
      {/* Upload / Register Card */}
      <div className="card">
        <div className="card-title">
          <span>Upload or Register Document</span>
        </div>
        <p className="card-subtitle">
          Upload certificates or manually input issue/expiry dates to test Document Locker and Validity Checker.
        </p>

        {error && (
          <div className="alert alert-danger">
            <strong>Error ({error.code}):</strong> {error.message}
          </div>
        )}

        {successMsg && <div className="alert alert-success">{successMsg}</div>}

        <form onSubmit={handleUpload}>
          <div className="grid-3">
            <div className="form-group">
              <label>Document Type *</label>
              <select value={docType} onChange={(e) => setDocType(e.target.value)}>
                <option value="AADHAAR">AADHAAR (Aadhaar Card)</option>
                <option value="BANK_ACCOUNT">BANK_ACCOUNT (Bank Passbook / Statement)</option>
                <option value="INCOME_CERTIFICATE">INCOME_CERTIFICATE (Income Certificate)</option>
                <option value="DISABILITY_CERTIFICATE">DISABILITY_CERTIFICATE (Disability Certificate 40%+)</option>
                <option value="RESIDENCE_PROOF">RESIDENCE_PROOF (Domicile / Residence Certificate)</option>
                <option value="CASTE_CERTIFICATE">CASTE_CERTIFICATE (Caste Certificate)</option>
                <option value="EDUCATION_CERTIFICATE">EDUCATION_CERTIFICATE (Marksheet / Degree)</option>
                <option value="DEATH_CERTIFICATE">DEATH_CERTIFICATE (Death Certificate)</option>
                <option value="BIRTH_CERTIFICATE">BIRTH_CERTIFICATE (Birth Certificate)</option>
                <option value="ELECTRICITY_CONNECTION">ELECTRICITY_CONNECTION (Electricity Bill)</option>
              </select>
            </div>

            <div className="form-group">
              <label>Select File (PDF / Image / Test File)</label>
              <input
                type="file"
                onChange={(e) => setSelectedFile(e.target.files[0] || null)}
              />
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Leave empty to use manual metadata fallback
              </span>
            </div>

            <div className="form-group">
              <label>Issue Date (Manual Fallback)</label>
              <input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Expiry Date (if applicable)</label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Issuing Authority</label>
              <input
                type="text"
                placeholder="e.g. Tehsildar, Uttar Pradesh"
                value={authority}
                onChange={(e) => setAuthority(e.target.value)}
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" disabled={uploading}>
            {uploading ? 'Uploading to S3 / Registering...' : selectedFile ? 'Upload File to Locker' : 'Register Metadata in Locker'}
          </button>
        </form>
      </div>

      {/* Locker Documents Table */}
      <div className="card">
        <div className="card-title">
          <span>Locker Documents ({documents.length})</span>
          <button className="btn btn-secondary btn-sm" onClick={fetchDocuments} disabled={loading}>
            {loading ? 'Refreshing...' : 'Refresh Locker'}
          </button>
        </div>

        {documents.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>No documents in your locker yet.</p>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Filename</th>
                  <th>Status</th>
                  <th>Issue Date</th>
                  <th>Expiry Date</th>
                  <th>Authority</th>
                  <th>Confidence</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => {
                  const statusBadge =
                    doc.status === 'VERIFIED' ? 'badge-green' :
                    doc.status === 'UPLOADED' ? 'badge-blue' :
                    doc.status === 'EXPIRED' ? 'badge-red' : 'badge-yellow';

                  return (
                    <tr key={doc.id}>
                      <td><strong>{doc.documentType}</strong></td>
                      <td style={{ fontSize: '12px' }}>{doc.filename || doc.storageKey || '-'}</td>
                      <td><span className={`badge ${statusBadge}`}>{doc.status}</span></td>
                      <td>{doc.issueDate || '-'}</td>
                      <td>{doc.expiryDate || '-'}</td>
                      <td>{doc.issuingAuthority || '-'}</td>
                      <td>{doc.extractionConfidence ? `${Math.round(doc.extractionConfidence * 100)}%` : '-'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleValidate(doc.id)}
                            disabled={validatingId === doc.id}
                          >
                            {validatingId === doc.id ? 'Checking...' : 'Check Validity'}
                          </button>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => setEditingDoc({ ...doc })}
                          >
                            Edit
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDelete(doc.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Validation Result Modal / Panel */}
      {validationResult && (
        <div className="card" style={{ borderColor: 'var(--primary)' }}>
          <div className="card-title">
            <span>Document Validity Result</span>
            <button className="btn btn-secondary btn-sm" onClick={() => setValidationResult(null)}>
              Close
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <span className={`badge ${
              validationResult.validityStatus === 'VALID' ? 'badge-green' :
              validationResult.validityStatus === 'EXPIRING_SOON' ? 'badge-yellow' :
              validationResult.validityStatus === 'EXPIRED' ? 'badge-red' : 'badge-gray'
            }`} style={{ fontSize: '13px', padding: '4px 10px' }}>
              {validationResult.validityStatus}
            </span>
            <span>{validationResult.message}</span>
          </div>

          <div className="grid-2" style={{ fontSize: '13px', background: '#FAFAFA', padding: '12px', borderRadius: '6px' }}>
            <div>
              <p><strong>Applicable Rule:</strong> {validationResult.ruleDescription || 'Configured validity rule'}</p>
              <p><strong>Rule Type:</strong> {validationResult.ruleType || 'STATE_DEFAULT'}</p>
            </div>
            <div>
              {validationResult.daysUntilExpiry != null && (
                <p><strong>Days Until Expiry:</strong> {validationResult.daysUntilExpiry} days</p>
              )}
              {validationResult.expiryDate && (
                <p><strong>Effective Expiry Date:</strong> {validationResult.expiryDate}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Metadata Edit Modal */}
      {editingDoc && (
        <div className="card" style={{ borderColor: 'var(--primary)' }}>
          <div className="card-title">
            <span>Manual Metadata Correction: {editingDoc.documentType}</span>
            <button className="btn btn-secondary btn-sm" onClick={() => setEditingDoc(null)}>
              Cancel
            </button>
          </div>

          <form onSubmit={handleCorrectionSubmit}>
            <div className="grid-3">
              <div className="form-group">
                <label>Issue Date</label>
                <input
                  type="date"
                  value={editingDoc.issueDate || ''}
                  onChange={(e) => setEditingDoc({ ...editingDoc, issueDate: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Expiry Date</label>
                <input
                  type="date"
                  value={editingDoc.expiryDate || ''}
                  onChange={(e) => setEditingDoc({ ...editingDoc, expiryDate: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Issuing Authority</label>
                <input
                  type="text"
                  value={editingDoc.issuingAuthority || ''}
                  onChange={(e) => setEditingDoc({ ...editingDoc, issuingAuthority: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Holder Name</label>
                <input
                  type="text"
                  value={editingDoc.holderName || ''}
                  onChange={(e) => setEditingDoc({ ...editingDoc, holderName: e.target.value })}
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-sm">
              Save Metadata Correction
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
