import { io } from 'socket.io-client';

const SERVER_URL = process.env.REACT_APP_SERVER_URL || '';

// Singleton socket — connected lazily on first use
export const socket = io(SERVER_URL, {
  autoConnect: false,
  transports: ['websocket'],
});

// Keepalive: Render's free tier spins the service down after ~15 min without an
// inbound HTTP request (a live WebSocket alone doesn't reset that timer). While
// we're connected (i.e. in a room), hit /health every 10 min to stay awake.
const KEEPALIVE_MS = 10 * 60 * 1000;
let keepaliveTimer = null;

function startKeepalive() {
  if (keepaliveTimer) return;
  keepaliveTimer = setInterval(() => {
    fetch(`${SERVER_URL}/health`, { cache: 'no-store' }).catch(() => {});
  }, KEEPALIVE_MS);
}

function stopKeepalive() {
  if (keepaliveTimer) {
    clearInterval(keepaliveTimer);
    keepaliveTimer = null;
  }
}

export function connectSocket() {
  if (!socket.connected) socket.connect();
  startKeepalive();
}

export function disconnectSocket() {
  if (socket.connected) socket.disconnect();
  stopKeepalive();
}
