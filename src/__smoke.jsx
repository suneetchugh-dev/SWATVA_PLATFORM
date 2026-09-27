/**
 * Render smoke test. Not part of the shipped bundle.
 *
 * Every route is rendered through renderToString inside the real providers.
 * Effects never run, so no network call is made; the point is to catch the
 * class of failure a production build cannot see — a hook called outside its
 * provider, a context value destructured as a tuple, a bad import — which
 * otherwise only appears as a white screen after a click.
 */
import './__globals.js'
import { renderToString } from 'react-dom/server'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ThemeProvider } from './lib/theme'
import './lib/i18n'

import AppShell from './layouts/AppShell.jsx'
import App from './App.jsx'
import Landing from './pages/Landing.jsx'
import Auth from './pages/Auth.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Profile from './pages/Profile.jsx'
import Discover from './pages/Discover.jsx'
import Matches from './pages/Matches.jsx'
import Readiness from './pages/Readiness.jsx'
import Benefits from './pages/Benefits.jsx'
import Documents from './pages/Documents.jsx'
import Transparency from './pages/Transparency.jsx'
import Assistant from './pages/Assistant.jsx'
import SchemeDetail from './pages/SchemeDetail.jsx'

const ID = '00000000-0000-0000-0000-000000000001'

// Auth redirects a signed-in visitor away from /login and /register, so the
// token is toggled per case rather than being on for the whole run.
// The trailing flag marks a case that is expected to render nothing because it
// redirects, so an empty render is the pass condition rather than a failure.
// [name, router pattern, initial URL, authenticated, element, expectRedirect]
const ROUTES = [
  ['landing', '/', '/', false, () => <Landing />],
  ['login', '/login', '/login', false, () => <Auth mode="login" />],
  ['login/authed', '/login', '/login', true, () => <Auth mode="login" />, true],
  ['register', '/register', '/register', false, () => <Auth mode="register" />],
  ['dashboard', '/app', '/app', true, () => <Dashboard />],
  ['profile', '/app/profile', '/app/profile', true, () => <Profile />],
  ['discover', '/app/discover', '/app/discover', true, () => <Discover />],
  ['matches', '/app/matches', '/app/matches', true, () => <Matches />],
  ['readiness', '/app/readiness/:id', `/app/readiness/${ID}`, true, () => <Readiness />],
  ['benefits', '/app/benefits', '/app/benefits', true, () => <Benefits />],
  ['documents', '/app/documents', '/app/documents', true, () => <Documents />],
  ['transparency', '/app/transparency', '/app/transparency', true, () => <Transparency />],
  ['assistant', '/app/assistant', '/app/assistant', true, () => <Assistant />],
  ['schemeDetail', '/schemes/:id', `/schemes/${ID}`, false, () => <SchemeDetail />],
  ['console', '/console', '/console', false, () => <App />],
  ['appShell', '/app/profile', '/app/profile', true, () => <AppShell />],
]

let failed = 0
for (const [name, pattern, url, authed, render, expectRedirect] of ROUTES) {
  if (authed) globalThis.localStorage.setItem('swatva_token', 'smoke-token')
  else globalThis.localStorage.removeItem('swatva_token')
  try {
    const html = renderToString(
      <ThemeProvider>
        <MemoryRouter initialEntries={[url]}>
          <Routes>
            <Route path={pattern} element={render()} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>,
    )
    // A matched-but-empty render means the pattern never hit, which would make
    // the whole check vacuous — unless a redirect is the expected outcome.
    if (!html.length) {
      if (expectRedirect) {
        console.log(`  ok    ${name.padEnd(13)} redirected as expected`)
        continue
      }
      throw new Error('route pattern did not match — nothing was rendered')
    }
    if (expectRedirect) throw new Error('expected a redirect, but content rendered')
    if (process.env.SMOKE_DEBUG === name) console.log(`
--- ${name} ---
${html}
`)
    console.log(`  ok    ${name.padEnd(13)} ${String(html.length).padStart(6)} chars`)
  } catch (err) {
    failed += 1
    console.log(`  FAIL  ${name.padEnd(13)} ${err?.message ?? err}`)
    const frame = String(err?.stack ?? '').split('\n').slice(1, 3).join('\n         ')
    console.log(`         ${frame}`)
  }
}

console.log(failed ? `\n${failed} of ${ROUTES.length} route(s) failed to render` : `\nall ${ROUTES.length} routes rendered`)
process.exit(failed ? 1 : 0)
