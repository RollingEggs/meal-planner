const SS = SpreadsheetApp.getActiveSpreadsheet();

function doGet() {
  const recipes = readSheet('recipes', ['id', 'name', 'genreId']);
  const genres = readSheet('genres', ['id', 'name', 'color']);
  const scheduled = readSheet('scheduled', ['id', 'recipeId', 'startDate', 'endDate', 'prepDate', 'mealTime', 'noPrep'])
    .map(s => ({ ...s, prepDate: s.prepDate || null, noPrep: s.noPrep === true || s.noPrep === 'TRUE' }));
  const memos = {};
  readSheet('memos', ['date', 'text']).forEach(({ date, text }) => { memos[date] = text; });

  return ContentService
    .createTextOutput(JSON.stringify({ recipes, genres, scheduled, memos }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    writeSheet('recipes', ['id', 'name', 'genreId'], data.recipes || []);
    writeSheet('genres', ['id', 'name', 'color'], data.genres || []);
    writeSheet('scheduled', ['id', 'recipeId', 'startDate', 'endDate', 'prepDate', 'mealTime', 'noPrep'],
      (data.scheduled || []).map(s => ({ ...s, prepDate: s.prepDate || '', noPrep: s.noPrep ? 'TRUE' : 'FALSE' }))
    );
    writeSheet('memos', ['date', 'text'],
      Object.entries(data.memos || {}).map(([date, text]) => ({ date, text }))
    );
    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function readSheet(name, cols) {
  const sheet = SS.getSheetByName(name);
  if (!sheet) return [];
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  return sheet.getRange(2, 1, lastRow - 1, cols.length).getValues()
    .filter(row => row[0] !== '')
    .map(row => Object.fromEntries(cols.map((c, i) => [c, row[i]])));
}

function writeSheet(name, cols, rows) {
  const sheet = SS.getSheetByName(name);
  if (!sheet) return;
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) sheet.getRange(2, 1, lastRow - 1, cols.length).clearContent();
  if (!rows.length) return;
  sheet.getRange(2, 1, rows.length, cols.length)
    .setValues(rows.map(r => cols.map(c => (r[c] !== undefined && r[c] !== null) ? r[c] : '')));
}
