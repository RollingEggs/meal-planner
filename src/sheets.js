const SYNC_URL_KEY = 'meal-planner-sync-url';

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
  if (!url) return null;
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

export function saveRemoteData(data) {
  const url = getSyncUrl();
  if (!url) return;
  // mode: 'no-cors' で CORS preflight を回避（レスポンスは読めないが保存は成功する）
  fetch(url, {
    method: 'POST',
    mode: 'no-cors',
    body: JSON.stringify(data),
  }).catch(() => {});
}
