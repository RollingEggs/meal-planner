const JSONBIN_API = 'https://api.jsonbin.io/v3/b';
const BIN_ID_KEY = 'meal-planner-jsonbin-bin-id';
const API_KEY_KEY = 'meal-planner-jsonbin-api-key';

export function getJsonBinConfig() {
  return {
    binId: localStorage.getItem(BIN_ID_KEY) || '',
    apiKey: localStorage.getItem(API_KEY_KEY) || '',
  };
}

export function setJsonBinConfig(binId, apiKey) {
  if (binId) localStorage.setItem(BIN_ID_KEY, binId);
  else localStorage.removeItem(BIN_ID_KEY);
  if (apiKey) localStorage.setItem(API_KEY_KEY, apiKey);
  else localStorage.removeItem(API_KEY_KEY);
}

export function isSyncConfigured() {
  const { binId, apiKey } = getJsonBinConfig();
  return !!(binId && apiKey);
}

export async function fetchRemoteData() {
  const { binId, apiKey } = getJsonBinConfig();
  if (!binId || !apiKey) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(`${JSONBIN_API}/${binId}/latest`, {
      headers: { 'X-Master-Key': apiKey },
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

// Returns true on success, false on network/API error, null if not configured
export async function saveRemoteData(data) {
  const { binId, apiKey } = getJsonBinConfig();
  if (!binId || !apiKey) return null;
  try {
    const res = await fetch(`${JSONBIN_API}/${binId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': apiKey,
      },
      body: JSON.stringify(data),
    });
    return res.ok;
  } catch {
    return false;
  }
}
