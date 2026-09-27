/**
 * Advanced Indic TTS & Speech Engine for Swatva AI Assistant.
 * Dual-Mode Engine:
 * 1. Native Neural Voice Engine (when OS has native Indic voices installed: Google हिन्दी, Microsoft Swara/Kalpana/Hemant).
 * 2. High-Fidelity Native Indic Audio Streamer (automatic fallback when OS lacks Hindi language packs, ensuring 100% authentic native Hindi pronunciation).
 */

let cachedVoices = [];
let activeAudioElement = null;

/**
 * Initialize and cache browser speech synthesis voices.
 */
export function initVoiceEngine() {
  if (typeof window === 'undefined') return;

  if ('speechSynthesis' in window) {
    const loadVoices = () => {
      try {
        cachedVoices = window.speechSynthesis.getVoices() || [];
      } catch (e) {
        cachedVoices = [];
      }
    };

    loadVoices();
    if (typeof window.speechSynthesis.onvoiceschanged !== 'undefined') {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }
}

// Auto-initialize if in browser
if (typeof window !== 'undefined') {
  initVoiceEngine();
}

/**
 * Check if the text contains Devanagari characters (Hindi/Marathi).
 */
export function hasDevanagari(text = '') {
  return /[\u0900-\u097F]/.test(text);
}

/**
 * Check if the text contains Kannada characters.
 */
export function hasKannada(text = '') {
  return /[\u0C80-\u0CFF]/.test(text);
}

/**
 * Detect language from text content.
 */
export function detectTextLanguage(text = '', fallback = 'en') {
  if (hasDevanagari(text)) return 'hi';
  if (hasKannada(text)) return 'kn';
  return fallback;
}

/**
 * Check if the current browser supports Speech Recognition (STT).
 */
export function isSpeechRecognitionSupported() {
  if (typeof window === 'undefined') return false;
  return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
}

/**
 * Check if the current browser supports Speech Synthesis (TTS).
 */
export function isSpeechSynthesisSupported() {
  if (typeof window === 'undefined') return false;
  return 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
}

/**
 * Maps application language code to standard BCP-47 speech recognition/synthesis language tags.
 */
export function getSpeechLocale(appLang = 'en') {
  const norm = String(appLang).toLowerCase().split('-')[0];
  switch (norm) {
    case 'hi':
      return 'hi-IN';
    case 'kn':
      return 'kn-IN';
    case 'bn':
      return 'bn-IN';
    case 'ta':
      return 'ta-IN';
    case 'te':
      return 'te-IN';
    case 'mr':
      return 'mr-IN';
    case 'gu':
      return 'gu-IN';
    case 'pa':
      return 'pa-IN';
    case 'ml':
      return 'ml-IN';
    default:
      return 'en-IN';
  }
}

/**
 * Finds authentic native Indic voice in the browser/OS.
 */
export function getBestVoiceForLocale(locale = 'hi-IN') {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;

  const voices = cachedVoices.length > 0 ? cachedVoices : window.speechSynthesis.getVoices() || [];
  if (!voices.length) return null;

  const langCode = locale.split('-')[0].toLowerCase();
  const fullLocale = locale.toLowerCase();

  // 1. Search for authentic Hindi voices by name or language tag
  if (langCode === 'hi') {
    const hindiVoice = voices.find((v) => {
      const name = (v.name || '').toLowerCase();
      const lang = (v.lang || '').toLowerCase();
      return (
        name.includes('हिन्दी') ||
        name.includes('hindi') ||
        name.includes('swara') ||
        name.includes('kalpana') ||
        name.includes('hemant') ||
        name.includes('lekha') ||
        lang === 'hi-in' ||
        lang === 'hi_in' ||
        lang === 'hi'
      );
    });
    if (hindiVoice) return hindiVoice;
  }

  // 2. Exact locale match with quality priority
  const exactMatches = voices.filter((v) => v.lang.toLowerCase() === fullLocale);
  const preferredExact = exactMatches.find((v) =>
    /natural|neural|google|microsoft|premium|enhanced/i.test(v.name)
  );
  if (preferredExact) return preferredExact;
  if (exactMatches.length > 0) return exactMatches[0];

  // 3. Language prefix match
  const prefixMatches = voices.filter((v) => v.lang.toLowerCase().startsWith(langCode));
  if (prefixMatches.length > 0) return prefixMatches[0];

  return null;
}

/**
 * Strip markdown formatting, raw URLs, symbols, and bullets.
 */
export function cleanTextForSpeech(rawText = '') {
  return rawText
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // [link](url) -> link
    .replace(/[*_~`#>]/g, '') // remove markdown symbols
    .replace(/[-•]\s+/g, '') // remove bullets
    .replace(/https?:\/\/\S+/gi, '') // remove URLs
    .replace(/\s+/g, ' ') // normalize whitespace
    .trim();
}

/**
 * Speaks text using the highest-authenticity native Indic voice.
 * If local OS lacks a genuine Hindi voice, falls back to the native Indic audio streamer.
 */
export function speakText(
  text,
  appLang = 'en',
  { onStart, onEnd, onError, rate, pitch = 1.0 } = {}
) {
  if (typeof window === 'undefined' || !text) return null;

  stopSpeaking(); // Stop previous audio or speech

  const cleanText = cleanTextForSpeech(text);
  if (!cleanText) return null;

  // Auto-detect language if text is written in Devanagari script
  const effectiveLang = detectTextLanguage(cleanText, appLang);
  const targetLocale = getSpeechLocale(effectiveLang);

  // Retrieve user preferred speech rate
  let finalRate = rate;
  if (finalRate == null) {
    const savedRate = localStorage.getItem('swatva_sound_speed');
    if (savedRate) finalRate = parseFloat(savedRate);
  }
  finalRate = finalRate && !isNaN(finalRate) ? finalRate : 1.0;

  // Check if browser has a native authentic voice for Hindi/Indic
  const nativeVoice = isSpeechSynthesisSupported() ? getBestVoiceForLocale(targetLocale) : null;
  const isGenuineHindiVoice =
    nativeVoice &&
    effectiveLang === 'hi' &&
    (nativeVoice.lang.toLowerCase().startsWith('hi') ||
      /hindi|हिन्दी|swara|kalpana|hemant|lekha/i.test(nativeVoice.name));

  // If we have a native authentic Hindi/Indic voice or non-Hindi request with native voice
  if (nativeVoice && (effectiveLang !== 'hi' || isGenuineHindiVoice)) {
    try {
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = targetLocale;
      utterance.voice = nativeVoice;
      utterance.rate = finalRate;
      utterance.pitch = pitch;

      if (onStart) utterance.onstart = onStart;
      if (onEnd) utterance.onend = onEnd;
      if (onError) utterance.onerror = onError;

      window.speechSynthesis.speak(utterance);
      return utterance;
    } catch (err) {
      console.warn('Native speech synthesis failed, trying audio fallback:', err);
    }
  }

  // Fallback: High-authenticity Native Indic Audio Streamer
  try {
    const maxChars = 200;
    const truncatedText = cleanText.length > maxChars ? cleanText.substring(0, maxChars) : cleanText;
    const audioUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(
      truncatedText
    )}&tl=${effectiveLang}&client=tw-ob`;

    const audio = new Audio(audioUrl);
    activeAudioElement = audio;
    audio.playbackRate = finalRate;

    audio.onplay = () => {
      if (onStart) onStart();
    };

    audio.onended = () => {
      activeAudioElement = null;
      if (onEnd) onEnd();
    };

    audio.onerror = (e) => {
      activeAudioElement = null;
      // Fallback to browser synthesis if online audio failed
      if (isSpeechSynthesisSupported()) {
        try {
          const fallbackUtterance = new SpeechSynthesisUtterance(cleanText);
          fallbackUtterance.lang = targetLocale;
          fallbackUtterance.rate = finalRate;
          if (onStart) fallbackUtterance.onstart = onStart;
          if (onEnd) fallbackUtterance.onend = onEnd;
          if (onError) fallbackUtterance.onerror = onError;
          window.speechSynthesis.speak(fallbackUtterance);
          return;
        } catch (innerErr) {
          // ignore
        }
      }
      if (onError) onError(e);
    };

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        // Fallback to standard speech synthesis
        if (isSpeechSynthesisSupported()) {
          const fallbackUtterance = new SpeechSynthesisUtterance(cleanText);
          fallbackUtterance.lang = targetLocale;
          fallbackUtterance.rate = finalRate;
          if (onStart) fallbackUtterance.onstart = onStart;
          if (onEnd) fallbackUtterance.onend = onEnd;
          if (onError) fallbackUtterance.onerror = onError;
          window.speechSynthesis.speak(fallbackUtterance);
        } else if (onError) {
          onError(err);
        }
      });
    }

    return audio;
  } catch (audioErr) {
    console.warn('Audio fallback exception:', audioErr);
    if (onError) onError(audioErr);
    return null;
  }
}

/**
 * Stops any ongoing speech or audio playback immediately.
 */
export function stopSpeaking() {
  if (activeAudioElement) {
    try {
      activeAudioElement.pause();
      activeAudioElement.currentTime = 0;
      activeAudioElement = null;
    } catch (e) {
      // ignore
    }
  }

  if (isSpeechSynthesisSupported()) {
    try {
      window.speechSynthesis.cancel();
    } catch (e) {
      // ignore
    }
  }
}

/**
 * Initializes a SpeechRecognition listener.
 */
export function createSpeechRecognizer({
  appLang = 'en',
  onResult,
  onInterim,
  onError,
  onStart,
  onEnd,
} = {}) {
  if (!isSpeechRecognitionSupported()) {
    return null;
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();

  recognition.lang = getSpeechLocale(appLang);
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  recognition.onstart = () => {
    if (onStart) onStart();
  };

  recognition.onresult = (event) => {
    let interimTranscript = '';
    let finalTranscript = '';

    for (let i = event.resultIndex; i < event.results.length; ++i) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalTranscript += transcript;
      } else {
        interimTranscript += transcript;
      }
    }

    if (interimTranscript && onInterim) {
      onInterim(interimTranscript);
    }
    if (finalTranscript && onResult) {
      onResult(finalTranscript);
    }
  };

  recognition.onerror = (event) => {
    if (onError) onError(event);
  };

  recognition.onend = () => {
    if (onEnd) onEnd();
  };

  return {
    start: () => {
      try {
        recognition.start();
      } catch (err) {
        console.warn('Recognition start exception:', err);
      }
    },
    stop: () => {
      try {
        recognition.stop();
      } catch (err) {
        // ignore
      }
    },
    abort: () => {
      try {
        recognition.abort();
      } catch (err) {
        // ignore
      }
    },
    setLang: (newLang) => {
      recognition.lang = getSpeechLocale(newLang);
    },
  };
}
