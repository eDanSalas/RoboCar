import { config } from '../config/runtimeConfig.js';

export async function getLatestGps() {
  const response = await fetch(`${config.apiBaseUrl}/api/devices/${config.deviceId}/gps`, {
    headers: {
      Authorization: `Bearer ${config.apiToken}`
    }
  });

  const payload = await readJson(response);

  if (!response.ok) {
    const message = payload?.error?.message || `GPS request failed with status ${response.status}.`;
    throw new Error(message);
  }

  return payload;
}

async function readJson(response) {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error('Backend returned an invalid JSON response.');
  }
}
