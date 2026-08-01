// Google スプレッドシート同期クライアント（Apps Script Web App 経由）
// サーバ側の実装は gas/Code.gs、セットアップ手順は gas/README.md を参照。

const URL_KEY = 'meal-planner-gas-url';
const TOKEN_KEY = 'meal-planner-gas-token';

// Apps Script は起動が遅いことがある（初回は特に）ので長めに待つ
const FETCH_TIMEOUT = 15000;

// 各シートの列。gas/Code.gs の SHEETS と順序を含めて一致させること。
export const SHEET_COLUMNS = {
  recipes: ['id', 'name', 'genreId'],
  genres: ['id', 'name', 'color'],
  scheduled: ['id', 'recipeId', 'startDate', 'endDate', 'prepDate', 'mealTime', 'noPrep'],
  memos: ['date', 'text'],
};

export function getSyncConfig() {
  return {
    url: localStorage.getItem(URL_KEY) || '',
    token: localStorage.getItem(TOKEN_KEY) || '',
  };
}

export function setSyncConfig(url, token) {
  if (url) localStorage.setItem(URL_KEY, url);
  else localStorage.removeItem(URL_KEY);
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export function isSyncConfigured() {
  return !!getSyncConfig().url;
}

export async function fetchRemoteData() {
  const { url, token } = getSyncConfig();
  if (!url) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
  try {
    const res = await fetch(`${url}?token=${encodeURIComponent(token)}`, {
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const json = await res.json();
    // Apps Script はエラーでも HTTP 200 を返すので、ボディの ok を見る
    if (!json || json.ok !== true) return null;
    return json;
  } catch {
    clearTimeout(timer);
    return null;
  }
}

// Returns true on success, false on network/API error, null if not configured
export async function saveRemoteData(data) {
  const { url, token } = getSyncConfig();
  if (!url) return null;
  try {
    const res = await fetch(url, {
      method: 'POST',
      // text/plain にすると CORS preflight が飛ばない。application/json だと
      // Apps Script が OPTIONS に応答できず保存が失敗する。
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ token, data }),
    });
    if (!res.ok) return false;
    const json = await res.json();
    return json?.ok === true;
  } catch {
    return false;
  }
}
