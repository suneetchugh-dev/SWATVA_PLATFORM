import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import './index.css'
import './lib/i18n'

import { getToken } from './api/client'
import { ThemeProvider } from './lib/theme'
import SplashLoader from './components/SplashLoader'
import { Spinner } from './components/ui'
import ScrollToTop from './components/ScrollToTop'
import { initGlobalClickSound } from './utils/soundFx'

initGlobalClickSound()

// The landing page is the public entry point, so it stays in the initial bundle.
// Everything behind auth is split out: a citizen who only reads the marketing
// page should not download the profile editor, the document locker and the chat
// client. The original console is lazy for the same reason — it is a dev tool.
import AppShell from './layouts/AppShell.jsx'
import Landing from './pages/Landing.jsx'
import Auth from './pages/Auth.jsx'

const App = lazy(() => import('./App.jsx')) // the original developer console, kept at /console
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'))
const Profile = lazy(() => import('./pages/Profile.jsx'))
const Matches = lazy(() => import('./pages/Matches.jsx'))
const Readiness = lazy(() => import('./pages/Readiness.jsx'))
const Benefits = lazy(() => import('./pages/Benefits.jsx'))
const Documents = lazy(() => import('./pages/Documents.jsx'))
const Discover = lazy(() => import('./pages/Discover.jsx'))
const Transparency = lazy(() => import('./pages/Transparency.jsx'))
const Assistant = lazy(() => import('./pages/Assistant.jsx'))
const SchemeDetail = lazy(() => import('./pages/SchemeDetail.jsx'))

/** Everything under /app needs a token; bounce to /login and remember where. */
function RequireAuth({ children }) {
  const location = useLocation()
  if (!getToken()) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return children
}

function RouteFallback() {
  return (
    <div className="flex items-center justify-center py-24 text-neutral-500 dark:text-neutral-400">
      <Spinner />
    </div>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <SplashLoader />
      <BrowserRouter>
        <ScrollToTop />
        <Suspense fallback={<RouteFallback />}>
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
              <Route index element={<Dashboard />} />
              <Route path="profile" element={<Profile />} />
              <Route path="discover" element={<Discover />} />
              <Route path="matches" element={<Matches />} />
              <Route path="readiness/:id" element={<Readiness />} />
              <Route path="benefits" element={<Benefits />} />
              <Route path="documents" element={<Documents />} />
              <Route path="transparency" element={<Transparency />} />
              <Route path="assistant" element={<Assistant />} />
            </Route>

            {/* The original single-page console, still useful for exercising every
                endpoint at once while developing. */}
            <Route path="/console" element={<App />} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>,
)
