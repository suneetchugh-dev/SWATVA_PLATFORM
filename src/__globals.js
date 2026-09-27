/**
 * Minimal browser globals for the render smoke test. Not shipped.
 *
 * `lib/i18n` and `lib/theme` read storage, `navigator` and `document` at module
 * evaluation time, so these have to exist before those modules are imported.
 * This module is therefore imported first in __smoke.jsx.
 */
const store = { swatva_token: 'smoke-token' }

const makeStorage = () => ({
  getItem: (k) => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v) },
  removeItem: (k) => { delete store[k] },
  clear: () => { for (const k of Object.keys(store)) delete store[k] },
  key: () => null,
  length: 0,
})

globalThis.localStorage = makeStorage()
globalThis.sessionStorage = makeStorage()

// Node 24 ships a read-only `navigator`, so only stand in when it is absent or
// has no language for i18next to detect from.
if (!globalThis.navigator?.language) {
  Object.defineProperty(globalThis, 'navigator', {
    value: { language: 'en-IN' },
    configurable: true,
    writable: true,
  })
}

globalThis.document = {
  documentElement: {
    setAttribute() {},
    classList: { toggle() {}, add() {}, remove() {}, contains: () => false },
  },
  addEventListener() {},
  removeEventListener() {},
  querySelector: () => null,
  querySelectorAll: () => [],
  getElementById: () => null,
  body: { classList: { toggle() {}, add() {}, remove() {} } },
}

const matchMedia = () => ({
  matches: false,
  addEventListener() {},
  removeEventListener() {},
  addListener() {},
  removeListener() {},
})

globalThis.matchMedia = globalThis.matchMedia ?? matchMedia
globalThis.window = globalThis.window ?? {}
globalThis.window.matchMedia = globalThis.window.matchMedia ?? matchMedia
globalThis.window.addEventListener ??= () => {}
globalThis.window.removeEventListener ??= () => {}
globalThis.window.scrollTo ??= () => {}
globalThis.window.innerWidth ??= 1280
globalThis.window.innerHeight ??= 800
globalThis.window.scrollY ??= 0
