import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import './index.css'
import './lib/i18n'

import { getToken } from './api/client'
import { ThemeProvider } from './lib/theme'

import App from './App.jsx' // the original developer console, kept at /console
import AppShell from './layouts/AppShell.jsx'
import Landing from './pages/Landing.jsx'
import Auth from './pages/Auth.jsx'
import Profile from './pages/Profile.jsx'
import Matches from './pages/Matches.jsx'
import Benefits from './pages/Benefits.jsx'
import Documents from './pages/Documents.jsx'
import Assistant from './pages/Assistant.jsx'
import SchemeDetail from './pages/SchemeDetail.jsx'

/** Everything under /app needs a token; bounce to /login and remember where. */
function RequireAuth({ children }) {
  const location = useLocation()
  if (!getToken()) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return children
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Auth mode="login" />} />
          <Route path="/register" element={<Auth mode="register" />} />
          <Route path="/schemes/:id" element={<SchemeDetail />} />

          <Route
            path="/app"
            element={
              <RequireAuth>
                <AppShell />
              </RequireAuth>
            }
          >
            <Route index element={<Navigate to="/app/profile" replace />} />
            <Route path="profile" element={<Profile />} />
            <Route path="matches" element={<Matches />} />
            <Route path="benefits" element={<Benefits />} />
            <Route path="documents" element={<Documents />} />
            <Route path="assistant" element={<Assistant />} />
          </Route>

          {/* The original single-page console, still useful for exercising every
              endpoint at once while developing. */}
          <Route path="/console" element={<App />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>,
)
