const SYNC_URL_KEY = 'meal-planner-sync-url';

function isValidSyncUrl(url) {
  if (!url) return false;
  try {
    const { protocol } = new URL(url);
    return protocol === 'https:';
  } catch {
    return false;
  }
}

export function getSyncUrl() {
  return localStorage.getItem(SYNC_URL_KEY) || '';
}

export function setSyncUrl(url) {
  if (url) {
    localStorage.setItem(SYNC_URL_KEY, url);
  } else {
    localStorage.removeItem(SYNC_URL_KEY);
  }
}

export async function fetchRemoteData() {
  const url = getSyncUrl();
  if (!isValidSyncUrl(url)) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 1000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    clearTimeout(timer);
    return null;
  }
}

// Returns true on success, false on network error, null if no valid URL configured
export async function saveRemoteData(data) {
  const url = getSyncUrl();
  if (!isValidSyncUrl(url)) return null;
  try {
    // Content-Type を明示しない文字列 body は text/plain 扱いになり
    // CORS preflight が不要。GAS がリダイレクトしても body が届く。
    await fetch(url, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return true;
  } catch {
    return false;
  }
}
