import { io } from 'socket.io-client';

export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

export function createSocketClient() {
  return io(SOCKET_URL, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 500,
    reconnectionDelayMax: 3000
  });
}
