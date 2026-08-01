/**
 * 献立管理ボード — Google スプレッドシート同期用 Apps Script
 *
 * セットアップ手順は gas/README.md を参照。
 * 要点だけ:
 *   1. スプレッドシートの「拡張機能 > Apps Script」にこのファイルを貼り付け
 *   2. 「プロジェクトの設定 > スクリプト プロパティ」に TOKEN を追加（合言葉）
 *   3. 「デプロイ > 新しいデプロイ > ウェブアプリ」
 *      実行するユーザー = 自分 / アクセスできるユーザー = 全員
 *   4. 発行された URL をアプリの ⚙ 設定 > 同期設定 に入力
 *
 * このスクリプトを編集したあとは、必ず「デプロイを管理」から新バージョンを
 * 発行すること。保存しただけでは公開 URL の挙動は変わらない。
 */

// 列の定義。src/sheets.js の SHEET_COLUMNS と順序を含めて一致させること。
const SHEETS = {
  recipes: ['id', 'name', 'genreId'],
  genres: ['id', 'name', 'color'],
  scheduled: ['id', 'recipeId', 'startDate', 'endDate', 'prepDate', 'mealTime', 'noPrep'],
  memos: ['date', 'text'],
};

const SS = SpreadsheetApp.getActiveSpreadsheet();
const TZ = SS.getSpreadsheetTimeZone();

function doGet(e) {
  const token = (e && e.parameter && e.parameter.token) || '';
  if (!isAuthorized(token)) return json({ ok: false, error: 'unauthorized' });

  const memos = {};
  readSheet('memos').forEach((row) => {
    if (row.date) memos[row.date] = row.text;
  });

  return json({
    ok: true,
    recipes: readSheet('recipes'),
    genres: readSheet('genres'),
    scheduled: readSheet('scheduled').map((s) => ({
      ...s,
      prepDate: s.prepDate || null,
      noPrep: s.noPrep === true || s.noPrep === 'TRUE',
    })),
    memos: memos,
  });
}

function doPost(e) {
  // clear → write の2段階なので、同時書き込みを直列化する
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return json({ ok: false, error: 'busy' });
  try {
    const body = JSON.parse(e.postData.contents);
    if (!isAuthorized(body.token || '')) return json({ ok: false, error: 'unauthorized' });

    const data = body.data || {};
    writeSheet('recipes', data.recipes || []);
    writeSheet('genres', data.genres || []);
    writeSheet('scheduled', (data.scheduled || []).map((s) => ({
      ...s,
      prepDate: s.prepDate || '',
      noPrep: s.noPrep ? 'TRUE' : 'FALSE',
    })));
    writeSheet('memos', Object.keys(data.memos || {}).map((date) => ({
      date: date,
      text: data.memos[date],
    })));

    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, error: String(err && err.message ? err.message : err) });
  } finally {
    lock.releaseLock();
  }
}

/** TOKEN が未設定のうちは通す（初期セットアップ用）。設定したら一致必須。 */
function isAuthorized(token) {
  const expected = PropertiesService.getScriptProperties().getProperty('TOKEN');
  if (!expected) return true;
  return token === expected;
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * シートが無ければヘッダー付きで作る。
 * 列をプレーンテキスト書式に固定するのが肝で、これを外すと '2026-08-01' が
 * 日付型に、ID が数値に化けてアプリ側の文字列比較が壊れる。
 */
function ensureSheet(name) {
  const cols = SHEETS[name];
  let sheet = SS.getSheetByName(name);
  if (!sheet) {
    sheet = SS.insertSheet(name);
    sheet.getRange(1, 1, 1, cols.length).setValues([cols]).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  sheet.getRange(1, 1, sheet.getMaxRows(), cols.length).setNumberFormat('@');
  return sheet;
}

function readSheet(name) {
  const cols = SHEETS[name];
  const sheet = ensureSheet(name);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  return sheet.getRange(2, 1, lastRow - 1, cols.length).getValues()
    .filter((row) => String(row[0]).trim() !== '')
    .map((row) => {
      const obj = {};
      cols.forEach((c, i) => {
        obj[c] = c === 'noPrep' ? row[i] : cellToString(row[i]);
      });
      return obj;
    });
}

function writeSheet(name, rows) {
  const cols = SHEETS[name];
  const sheet = ensureSheet(name);
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) sheet.getRange(2, 1, lastRow - 1, cols.length).clearContent();
  if (!rows.length) return;
  sheet.getRange(2, 1, rows.length, cols.length).setValues(
    rows.map((r) => cols.map((c) => (r[c] === undefined || r[c] === null) ? '' : r[c]))
  );
}

/** 手編集などで日付型・数値になったセルを 'YYYY-MM-DD' / 文字列に戻す */
function cellToString(v) {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return Utilities.formatDate(v, TZ, 'yyyy-MM-dd');
  return String(v).trim();
}
