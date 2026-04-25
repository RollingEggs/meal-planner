const JSONBIN_API = 'https://api.jsonbin.io/v3/b';
const BIN_ID = '69c44f1eaa77b81da91c9440';
const MASTER_KEY = '$2a$10$fMkAa3oegDr0V/5Y8w7tdObP.2/VvaNlB/RCSAz/guqFWmMXuNIsG';

export async function fetchRemoteData() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);
  try {
    const res = await fetch(`${JSONBIN_API}/${BIN_ID}/latest`, {
      headers: { 'X-Master-Key': MASTER_KEY },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const json = await res.json();
    return json.record || null;
  } catch {
    clearTimeout(timer);
    return null;
  }
}

export function saveRemoteData(data) {
  fetch(`${JSONBIN_API}/${BIN_ID}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-Master-Key': MASTER_KEY,
    },
    body: JSON.stringify(data),
  }).catch(() => {});
}
