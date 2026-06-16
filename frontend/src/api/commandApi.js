export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const API_TOKEN = import.meta.env.VITE_API_TOKEN || 'change_me';

export async function sendCommand({ command, speed }) {
  const response = await fetch(`${API_BASE_URL}/api/commands`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ command, speed })
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
