// Game constants
export const STORAGE_KEY = 'pong_username';

// Game settings
export const INITIAL_BALL_SPEED = 31;
export const PADDLE_SPEED = 0.01;
export const INITIAL_RATING = 1000;

const DEFAULT_LOCAL_BACKEND = 'http://localhost:5301';
const DEFAULT_FLY_BACKEND = 'https://k-pong-backend.fly.dev';

/** Resolve backend URL at call time (after public/config.js has loaded). */
export function getBackendUrl() {
  const runtime =
    typeof window !== 'undefined' && window.__K_PONG_CONFIG__?.BACKEND_URL;
  if (runtime) {
    return runtime.replace(/\/$/, '');
  }

  const fromEnv = process.env.REACT_APP_BACKEND_URL;
  if (fromEnv) {
    return fromEnv.replace(/\/$/, '');
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
