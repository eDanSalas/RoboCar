import { config } from '../config/runtimeConfig.js';

export const API_BASE_URL = config.apiBaseUrl;

export async function sendCommand({ command, speed, direction, leftSpeed, rightSpeed }) {
  const body = { command, speed };

  if (direction) {
    body.direction = direction;
  }

  if (leftSpeed !== undefined) {
    body.leftSpeed = leftSpeed;
  }

  if (rightSpeed !== undefined) {
    body.rightSpeed = rightSpeed;
  }

  const response = await fetch(`${API_BASE_URL}/api/commands`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  const payload = await readJson(response);

  if (!response.ok) {
    const message = payload?.error?.message || `Command request failed with status ${response.status}.`;
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
