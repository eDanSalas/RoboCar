import { io } from 'socket.io-client';
import { config } from '../config/runtimeConfig.js';

export const SOCKET_URL = config.socketUrl;

export function createSocketClient() {
  return io(SOCKET_URL, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 500,
    reconnectionDelayMax: 3000
  });
}
