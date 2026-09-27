import React, { useState } from 'react';
import { api } from '../api/client';

export default function AiQuerySection() {
  const [query, setQuery] = useState('What are the eligibility criteria and benefits of PM-KISAN?');
  const [state, setState] = useState('');
  const [category, setCategory] = useState('');
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Vector store indexing state
  const [indexing, setIndexing] = useState(false);
  const [indexResult, setIndexResult] = useState(null);

  const handleQuery = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.ai.query(query, state || null, category || null);
      setResponse(data);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleReindex = async () => {
    if (!window.confirm('Trigger vector store chunking and Qdrant re-indexing for all 20 schemes?')) return;
    setIndexing(true);
    try {
      const result = await api.ai.reindex();
      setIndexResult(result);
    } catch (err) {
      alert(`Indexing failed: ${err.message}`);
    } finally {
      setIndexing(false);
    }
  };

  return (
    <div>
      {/* Re-indexing utility banner */}
      <div className="card" style={{ background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <strong>Qdrant Vector Store Management</strong>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Re-chunk all 20 schemes (120 chunks) and upsert embeddings into Qdrant collection <code>sahayak_schemes</code>.
          </p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={handleReindex} disabled={indexing}>
          {indexing ? 'Indexing Qdrant...' : 'Trigger Full Re-Indexing'}
        </button>
      </div>

      {indexResult && (
        <div className="alert alert-success" style={{ marginBottom: '16px' }}>
          <strong>Indexing Success:</strong> {indexResult.message} ({indexResult.schemesIndexed} schemes, {indexResult.chunksIndexed} chunks)
        </div>
      )}

      {/* RAG Query Card */}
      <div className="card">
        <div className="card-title">
          <span>Semantic Scheme Query (RAG + Qdrant)</span>
        </div>
        <p className="card-subtitle">
          Retrieves grounded scheme chunks from the Qdrant vector store and generates answers strictly from verified information without inventing rules.
        </p>

        {error && (
          <div className="alert alert-danger">
            <strong>Error ({error.code}):</strong> {error.message}
          </div>
        )}

        <form onSubmit={handleQuery} style={{ marginBottom: '16px' }}>
          <div className="form-group">
            <label>Citizen Question *</label>
            <input
              type="text"
              required
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. What documents are required for UP Old Age Pension?"
            />
          </div>

          <div className="grid-2" style={{ marginBottom: '12px' }}>
            <div className="form-group">
              <label>Optional State Filter</label>
              <select value={state} onChange={(e) => setState(e.target.value)}>
                <option value="">All States / Central</option>
                <option value="Uttar Pradesh">Uttar Pradesh</option>
                <option value="Karnataka">Karnataka</option>
              </select>
            </div>
            <div className="form-group">
              <label>Optional Category Filter</label>
              <input
                type="text"
                placeholder="e.g. Agriculture, Social welfare, Health"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Searching Qdrant & Generating Answer...' : 'Ask Question (Semantic RAG)'}
          </button>
        </form>

        {/* Query Response */}
        {response && (
          <div>
            <div className="card" style={{ background: '#fff', border: '1px solid var(--border)', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <strong>Grounded LLM Answer:</strong>
                <span className={`badge ${response.grounded ? 'badge-green' : 'badge-yellow'}`}>
                  {response.grounded ? 'Grounded in Scheme Facts' : 'Insufficient Facts'}
                </span>
              </div>
              <p style={{ fontSize: '14px', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                {response.answer}
              </p>
            </div>

            {/* Citations */}
            {response.citations && response.citations.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <h4 style={{ marginBottom: '8px' }}>Verified Source Citations</h4>
                <ul style={{ paddingLeft: '20px' }}>
                  {response.citations.map((c, i) => (
                    <li key={i} style={{ marginBottom: '4px' }}>
                      <strong>{c.schemeName}</strong>: <a href={c.sourceUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)' }}>{c.sourceUrl}</a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Retrieved Chunks */}
            {response.retrievedChunks && response.retrievedChunks.length > 0 && (
              <div>
                <h4 style={{ marginBottom: '8px' }}>Retrieved Scheme Chunks ({response.retrievedChunks.length})</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {response.retrievedChunks.map((chunk, idx) => (
                    <div key={idx} style={{ background: '#f8fafc', border: '1px solid var(--border)', borderRadius: '6px', padding: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                        <strong>{chunk.schemeName}</strong>
                        <span className="badge badge-gray">{chunk.documentType}</span>
                      </div>
                      <p style={{ fontSize: '12px', whiteSpace: 'pre-wrap', color: 'var(--text-muted)' }}>
                        {chunk.content}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
