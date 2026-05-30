import { io } from 'socket.io-client';

const SERVER_URL = process.env.REACT_APP_SERVER_URL || '';

// Singleton socket — connected lazily on first use
export const socket = io(SERVER_URL, {
  autoConnect: false,
  transports: ['websocket'],
});

export function connectSocket() {
  if (!socket.connected) socket.connect();
}

export function disconnectSocket() {
  if (socket.connected) socket.disconnect();
}
