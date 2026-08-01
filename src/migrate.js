import { SHEET_COLUMNS } from './sheets';

// タブ・改行はセルを壊すので空白に潰す（主にメモ本文が対象）
const cell = (v) => {
  if (v === undefined || v === null) return '';
  return String(v).replace(/[\t\r\n]+/g, ' ');
};

/** アプリのデータを、各シートに書き込まれるのと同じ行の形に変換する */
function toRows(data) {
  return {
    recipes: data.recipes || [],
    genres: data.genres || [],
    scheduled: (data.scheduled || []).map((s) => ({
      ...s,
      prepDate: s.prepDate || '',
      noPrep: s.noPrep ? 'TRUE' : 'FALSE',
    })),
    memos: Object.entries(data.memos || {}).map(([date, text]) => ({ date, text })),
  };
}

/**
 * 移行用のタブ区切りテキストをシートごとに生成する。
 * カンマ区切りだとスプレッドシートに貼ったとき1セルに固まってしまうが、
 * タブ区切りなら貼り付けるだけで列に分かれる。
 */
export function toSheetTables(data) {
  const rows = toRows(data);
  return Object.keys(SHEET_COLUMNS).map((name) => {
    const cols = SHEET_COLUMNS[name];
    const lines = [cols.join('\t')];
    rows[name].forEach((r) => {
      lines.push(cols.map((c) => cell(r[c])).join('\t'));
    });
    return { name, tsv: lines.join('\n'), count: rows[name].length };
  });
}
