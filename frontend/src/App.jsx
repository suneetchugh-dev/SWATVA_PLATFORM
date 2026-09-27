import React, { useState, useEffect } from 'react';
import { api, getStoredUser, getToken } from './api/client';
import AuthSection from './components/AuthSection';
import ProfileSection from './components/ProfileSection';
import SchemesSection from './components/SchemesSection';
import EligibilitySection from './components/EligibilitySection';
import BenefitsSection from './components/BenefitsSection';
import ChecklistAndReadinessSection from './components/ChecklistAndReadinessSection';
import DocumentsSection from './components/DocumentsSection';
import AiQuerySection from './components/AiQuerySection';
import ChatSection from './components/ChatSection';
import TransparencySection from './components/TransparencySection';

export default function App() {
  const [activeTab, setActiveTab] = useState('auth');
  const [currentUser, setCurrentUser] = useState(getStoredUser());
  const [backendHealth, setBackendHealth] = useState(null);
  const [selectedSchemeId, setSelectedSchemeId] = useState(null);

  const checkHealth = async () => {
    try {
      const data = await api.health.check();
      setBackendHealth(data || { status: 'UP' });
    } catch {
      setBackendHealth({ status: 'OFFLINE' });
    }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleAuthChange = () => {
    setCurrentUser(getStoredUser());
  };

  const handleSelectSchemeForReadiness = (scheme) => {
    setSelectedSchemeId(scheme.id);
    setActiveTab('readiness');
  };

  return (
    <div className="app-container">
      {/* Top Header */}
      <header className="app-header">
        <div className="brand-title">
          <span style={{ fontSize: '22px' }}>🇮🇳</span>
          <span>Sahayak AI — Backend Test Console</span>
        </div>

        <div className="header-status">
          {backendHealth ? (
            <span className={`badge ${backendHealth.status === 'UP' ? 'badge-green' : 'badge-red'}`}>
              Backend {backendHealth.status === 'UP' ? 'Online (:8080)' : 'Offline'}
            </span>
          ) : (
            <span className="badge badge-gray">Connecting...</span>
          )}

          {currentUser ? (
            <span style={{ fontSize: '13px', color: 'var(--text)' }}>
              Logged in: <strong>{currentUser.email}</strong>
            </span>
          ) : (
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              Not logged in
            </span>
          )}
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="nav-tabs">
        <button
          className={`nav-tab ${activeTab === 'auth' ? 'active' : ''}`}
          onClick={() => setActiveTab('auth')}
        >
          1. Auth
        </button>
        <button
          className={`nav-tab ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          2. User Profile
        </button>
        <button
          className={`nav-tab ${activeTab === 'schemes' ? 'active' : ''}`}
          onClick={() => setActiveTab('schemes')}
        >
          3. Schemes Catalogue
        </button>
        <button
          className={`nav-tab ${activeTab === 'eligibility' ? 'active' : ''}`}
          onClick={() => setActiveTab('eligibility')}
        >
          4. Eligibility Matches
        </button>
        <button
          className={`nav-tab ${activeTab === 'benefits' ? 'active' : ''}`}
          onClick={() => setActiveTab('benefits')}
        >
          5. Benefits & Missed Value
        </button>
        <button
          className={`nav-tab ${activeTab === 'readiness' ? 'active' : ''}`}
          onClick={() => setActiveTab('readiness')}
        >
          6. Checklist & Readiness
        </button>
        <button
          className={`nav-tab ${activeTab === 'documents' ? 'active' : ''}`}
          onClick={() => setActiveTab('documents')}
        >
          7. Document Locker
        </button>
        <button
          className={`nav-tab ${activeTab === 'ai' ? 'active' : ''}`}
          onClick={() => setActiveTab('ai')}
        >
          8. RAG / AI Query
        </button>
        <button
          className={`nav-tab ${activeTab === 'chat' ? 'active' : ''}`}
          onClick={() => setActiveTab('chat')}
        >
          9. Assistant Chat
        </button>
        <button
          className={`nav-tab ${activeTab === 'transparency' ? 'active' : ''}`}
          onClick={() => setActiveTab('transparency')}
        >
          10. Transparency
        </button>
      </nav>

      {/* Main Content Area */}
      <main>
        {activeTab === 'auth' && <AuthSection onAuthChange={handleAuthChange} />}
        {activeTab === 'profile' && <ProfileSection />}
        {activeTab === 'schemes' && (
          <SchemesSection onSelectSchemeForReadiness={handleSelectSchemeForReadiness} />
        )}
        {activeTab === 'eligibility' && <EligibilitySection />}
        {activeTab === 'benefits' && <BenefitsSection />}
        {activeTab === 'readiness' && (
          <ChecklistAndReadinessSection initialSchemeId={selectedSchemeId} />
        )}
        {activeTab === 'documents' && <DocumentsSection />}
        {activeTab === 'ai' && <AiQuerySection />}
        {activeTab === 'chat' && <ChatSection />}
        {activeTab === 'transparency' && <TransparencySection />}
      </main>
    </div>
  );
}
