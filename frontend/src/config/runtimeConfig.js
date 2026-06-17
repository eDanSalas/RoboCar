const runtimeConfig = typeof window !== 'undefined' && window.__ROBOTCAR_CONFIG__
  ? window.__ROBOTCAR_CONFIG__
  : {};

export const config = Object.freeze({
  apiBaseUrl: runtimeConfig.apiBaseUrl || import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
  socketUrl: runtimeConfig.socketUrl || import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000',
  apiToken: runtimeConfig.apiToken || import.meta.env.VITE_API_TOKEN || 'change_me'
});
