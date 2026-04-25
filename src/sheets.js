// Apps Script Web App URL — デプロイ後に設定
const APPS_SCRIPT_URL = '';

export async function fetchRemoteData() {
  if (!APPS_SCRIPT_URL) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 1000);
  try {
    const res = await fetch(APPS_SCRIPT_URL, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    clearTimeout(timer);
    return null;
  }
}

export function saveRemoteData(data) {
  if (!APPS_SCRIPT_URL) return;
  // mode: 'no-cors' で CORS preflight を回避（レスポンスは読めないが保存は成功する）
  fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    mode: 'no-cors',
    body: JSON.stringify(data),
  }).catch(() => {});
}
