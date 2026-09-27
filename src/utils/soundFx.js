/**
 * Sound Effects Engine for SWATVA
 * Low-latency audio pool for tactile UI clicks, loading screen, and card interactions.
 * Respects user preferences in localStorage ('swatva_sound', 'swatva_sound_click', etc.)
 */

const CLICK_SOUND_PATH = '/sounds/click.mp3';
const LOADING_SOUND_PATH = '/sounds/Loading_Screen.mp3';
const CARD_SPREAD_PATH = '/sounds/card_spread.wav';
const CARD_SWIPED_PATH = '/sounds/card_swiped.wav';

const clickAudioPool = [];
const POOL_SIZE = 6;
let poolIndex = 0;
let isAudioPoolInitialized = false;

export function initAudioPool() {
  if (typeof window === 'undefined' || isAudioPoolInitialized) return;
  isAudioPoolInitialized = true;
  for (let i = 0; i < POOL_SIZE; i++) {
    try {
      const audio = new Audio(CLICK_SOUND_PATH);
      audio.volume = 0.35;
      audio.load();
      clickAudioPool.push(audio);
    } catch (e) {
      console.warn('Failed to initialize click audio:', e);
    }
  }
}

export function isSoundEnabled(type = 'click') {
  if (typeof window === 'undefined') return false;
  const master = localStorage.getItem('swatva_sound') !== 'off';
  if (!master) return false;
  if (type === 'click') return localStorage.getItem('swatva_sound_click') !== 'off';
  if (type === 'load') return localStorage.getItem('swatva_sound_load') !== 'off';
  return true;
}

export function playClick() {
  if (!isSoundEnabled('click')) return;

  initAudioPool();
  try {
    if (clickAudioPool.length > 0) {
      const sound = clickAudioPool[poolIndex];
      sound.currentTime = 0;
      sound.volume = 0.35;
      const playPromise = sound.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {});
      }
      poolIndex = (poolIndex + 1) % clickAudioPool.length;
    }
  } catch (err) {
    // Fallback silent
  }
}

export function playLoadingSound() {
  if (!isSoundEnabled('load')) return;

  try {
    const audio = new Audio(LOADING_SOUND_PATH);
    audio.volume = 0.45;
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {});
    }
  } catch (err) {
    // Fallback silent
  }
}

export function playCardSpread() {
  if (!isSoundEnabled('click')) return;
  try {
    const audio = new Audio(CARD_SPREAD_PATH);
    audio.volume = 0.35;
    audio.play().catch(() => {});
  } catch (e) {}
}

export function playCardSwiped() {
  if (!isSoundEnabled('click')) return;
  try {
    const audio = new Audio(CARD_SWIPED_PATH);
    audio.volume = 0.35;
    audio.play().catch(() => {});
  } catch (e) {}
}

export function initGlobalClickSound() {
  if (typeof document === 'undefined') return;
  if (document.documentElement.dataset.soundInit === '1') return;
  document.documentElement.dataset.soundInit = '1';
  initAudioPool();

  document.addEventListener('click', (e) => {
    const target = e.target.closest('[data-sound="click"], .cta-sound');
    if (target) {
      playClick();
    }
  }, { capture: true, passive: true });
}
