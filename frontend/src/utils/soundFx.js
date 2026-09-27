/**
 * Tactile Haptic Sound Effects Engine for SWATVA
 * Generates low-latency high-fidelity micro-clicks and chimes via Web Audio API.
 * Zero asset dependency, fails safely if audio is not permitted.
 */

let audioCtx = null;

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!audioCtx) {
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function playClick() {
  if (typeof window === 'undefined') return;
  const soundMaster = localStorage.getItem('swatva_sound') !== 'off';
  const clickSound = localStorage.getItem('swatva_sound_click') !== 'off';
  if (!soundMaster || !clickSound) return;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1400, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(280, ctx.currentTime + 0.022);

    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.022);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.022);
  } catch (err) {
    // Ignore audio play errors
  }
}

export function playLoadingChime() {
  if (typeof window === 'undefined') return;
  const soundMaster = localStorage.getItem('swatva_sound') !== 'off';
  const loadSound = localStorage.getItem('swatva_sound_load') !== 'off';
  if (!soundMaster || !loadSound) return;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    [523.25, 659.25, 783.99].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.08);

      gain.gain.setValueAtTime(0.04, now + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.08 + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.3);
    });
  } catch (err) {}
}
