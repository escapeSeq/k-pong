// Game constants
export const STORAGE_KEY = 'pong_username';
export const GAME_MODE_STORAGE_KEY = 'pong_game_mode';
export const AUDIO_UNLOCKED_KEY = 'pong_audio_unlocked';

export function isAudioUnlockedStored() {
  try {
    return sessionStorage.getItem(AUDIO_UNLOCKED_KEY) === '1';
  } catch {
    return false;
  }
}

export function setAudioUnlockedStored() {
  try {
    sessionStorage.setItem(AUDIO_UNLOCKED_KEY, '1');
  } catch {
    // ignore
  }
}

export function getStoredGameMode() {
  try {
    const mode = sessionStorage.getItem(GAME_MODE_STORAGE_KEY);
    return mode === 'bot' || mode === 'online' ? mode : null;
  } catch {
    return null;
  }
}

export function setStoredGameMode(mode) {
  try {
    if (mode === 'bot' || mode === 'online') {
      sessionStorage.setItem(GAME_MODE_STORAGE_KEY, mode);
    }
  } catch {
    // ignore
  }
}

export function clearStoredGameMode() {
  try {
    sessionStorage.removeItem(GAME_MODE_STORAGE_KEY);
  } catch {
    // ignore
  }
}

// Game settings
export const INITIAL_BALL_SPEED = 31;
export const PADDLE_SPEED = 0.01;
export const INITIAL_RATING = 1000;

const DEFAULT_LOCAL_BACKEND = 'http://localhost:5301';
const DEFAULT_FLY_BACKEND = 'https://k-pong-backend.fly.dev';

function normalizeBackendUrl(url) {
  const trimmed = url.replace(/\/$/, '');
  // Legacy/incorrect local port (backend listens on 5301 in docker-compose)
  if (
    trimmed === 'http://localhost:5000' ||
    trimmed === 'http://127.0.0.1:5000'
  ) {
    return DEFAULT_LOCAL_BACKEND;
  }
  return trimmed;
}

/** Resolve backend URL at call time (after public/config.js has loaded). */
export function getBackendUrl() {
  const runtime =
    typeof window !== 'undefined' && window.__K_PONG_CONFIG__?.BACKEND_URL;
  if (runtime) {
    return normalizeBackendUrl(runtime);
  }

  const fromEnv = process.env.REACT_APP_BACKEND_URL;
  if (fromEnv) {
    return normalizeBackendUrl(fromEnv);
  }

  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'k-pong.fly.dev' || host.endsWith('.k-pong.fly.dev')) {
      return DEFAULT_FLY_BACKEND;
    }
    if (host.endsWith('.fly.dev') && host.includes('k-pong') && !host.includes('backend')) {
      return DEFAULT_FLY_BACKEND;
    }
  }

  return DEFAULT_LOCAL_BACKEND;
}
