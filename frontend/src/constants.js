// Game constants
export const STORAGE_KEY = 'pong_username';

// Game settings
export const INITIAL_BALL_SPEED = 31;
export const PADDLE_SPEED = 0.01;
export const INITIAL_RATING = 1000;

// Backend connection (CRA embeds REACT_APP_* at build/start time)
function resolveBackendUrl() {
  const fromEnv = process.env.REACT_APP_BACKEND_URL;
  if (fromEnv) {
    return fromEnv.replace(/\/$/, '');
  }

  if (typeof window !== 'undefined' && window.location.hostname === 'k-pong.fly.dev') {
    return 'https://k-pong-backend.fly.dev';
  }

  return 'http://localhost:5301';
}

export const BACKEND_URL = resolveBackendUrl(); 