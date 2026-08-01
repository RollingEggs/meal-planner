import React, { useState, useMemo } from 'react';
import { getSyncConfig, setSyncConfig } from '../sheets';
import { toSheetTables } from '../migrate';

export default function SettingsModal({ data, onImport, onClose }) {
  const [jsonText, setJsonText] = useState('');
  const [mode, setMode] = useState('sync');
  const cfg = getSyncConfig();
  const [url, setUrl] = useState(cfg.url);
  const [token, setToken] = useState(cfg.token);
  const [saved, setSaved] = useState(false);
  const [copiedSheet, setCopiedSheet] = useState('');

  const exportData = JSON.stringify(data, null, 2);
  const tables = useMemo(() => toSheetTables(data), [data]);

  const handleImport = () => {
    try {
      const parsed = JSON.parse(jsonText);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        alert('データ形式が正しくありません');
        return;
      }
      if (!Array.isArray(parsed.recipes) || !Array.isArray(parsed.genres)) {
        alert('データ形式が正しくありません（recipes と genres が必要です）');
        return;
      }
      onImport(parsed);
      onClose();
    } catch {
      alert('JSONの解析に失敗しました');
    }
  };

  const copyText = (text, onDone) => {
    if (!navigator.clipboard) {
      alert('このブラウザはクリップボードに対応していません。テキストを手動で選択してコピーしてください。');
      return;
    }
    navigator.clipboard.writeText(text).then(onDone).catch(() => {
      alert('コピーに失敗しました。テキストを手動で選択してコピーしてください。');
    });
  };

  const handleCopy = () => copyText(exportData, () => alert('コピーしました'));

  const handleCopySheet = (table) => {
    copyText(table.tsv, () => {
      setCopiedSheet(table.name);
      setTimeout(() => setCopiedSheet(''), 1500);
    });
  };

  const handleSave = () => {
    setSyncConfig(url.trim(), token.trim());
    setSaved(true);
    // Reload to restart sync with new credentials
    setTimeout(() => window.location.reload(), 800);
  };

  const btnStyle = (active) => ({
    flex: 1, padding: '8px 0',
    border: `2px solid ${active ? '#3D3D3D' : '#ddd'}`,
    borderRadius: 8,
    background: active ? '#3D3D3D' : '#fff',
    color: active ? '#fff' : '#666',
    fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
    whiteSpace: 'nowrap',
  });

  const inputStyle = {
    width: '100%', padding: '10px 12px', border: '1px solid #ddd',
    borderRadius: 8, fontSize: 13, fontFamily: 'inherit',
    boxSizing: 'border-box',
  };

  const overlay = {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.4)', zIndex: 9999,
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
  };

  return (
    <div style={overlay} onClick={onClose}>
      <div style={{
        background: '#fff', borderRadius: 16, padding: 20, width: '100%', maxWidth: 420,
        maxHeight: '80vh', overflow: 'auto',
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>⚙ 設定</div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
          <button onClick={() => setMode('sync')} style={btnStyle(mode === 'sync')}>同期設定</button>
          <button onClick={() => setMode('migrate')} style={btnStyle(mode === 'migrate')}>移行</button>
          <button onClick={() => setMode('export')} style={btnStyle(mode === 'export')}>書き出し</button>
          <button onClick={() => setMode('import')} style={btnStyle(mode === 'import')}>読み込み</button>
        </div>

        {mode === 'sync' && (
          <>
            <p style={{ fontSize: 12, color: '#666', marginBottom: 10, lineHeight: 1.6 }}>
              Google スプレッドシートに保存します。スプレッドシートに Apps Script を
              設置して「ウェブアプリ」としてデプロイし、その URL を入力してください
              （手順は gas/README.md）。この設定はこのデバイスのみに保存され、
              コードには含まれません。
            </p>
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>ウェブアプリ URL</div>
              <input
                value={url}
                onChange={(e) => { setUrl(e.target.value); setSaved(false); }}
                placeholder="https://script.google.com/macros/s/.../exec"
                style={inputStyle}
              />
            </div>
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>合言葉（スクリプト プロパティの TOKEN）</div>
              <input
                type="password"
                value={token}
                onChange={(e) => { setToken(e.target.value); setSaved(false); }}
                placeholder="TOKEN を設定していない場合は空のまま"
                style={inputStyle}
              />
            </div>
            <button onClick={handleSave} style={{
              width: '100%', padding: '10px 0',
              background: saved ? '#2D6A4F' : '#3D3D3D',
              color: '#fff', border: 'none', borderRadius: 8,
              fontSize: 14, fontWeight: 700, cursor: 'pointer',
              fontFamily: 'inherit', marginTop: 4, transition: 'background 0.2s',
            }}>
              {saved ? '✓ 保存しました' : '保存'}
            </button>
          </>
        )}

        {mode === 'migrate' && (
          <>
            <p style={{ fontSize: 12, color: '#666', marginBottom: 10, lineHeight: 1.6 }}>
              今のデータをスプレッドシートに移すための表です。シートごとにコピーして、
              スプレッドシートの同じ名前のシートの <b>A1 セル</b>に貼り付けてください
              （1行目の見出しごと貼り付けます）。タブ区切りなので、貼るだけで列に分かれます。
            </p>
            {tables.map((t) => (
              <div key={t.name} style={{ marginBottom: 12 }}>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  marginBottom: 4,
                }}>
                  <div style={{ fontSize: 12, fontWeight: 700 }}>
                    {t.name}
                    <span style={{ fontSize: 11, color: '#888', fontWeight: 400, marginLeft: 6 }}>
                      {t.count}件
                    </span>
                  </div>
                  <button onClick={() => handleCopySheet(t)} style={{
                    padding: '5px 12px',
                    background: copiedSheet === t.name ? '#2D6A4F' : '#3D3D3D',
                    color: '#fff', border: 'none', borderRadius: 6,
                    fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                  }}>
                    {copiedSheet === t.name ? '✓ コピー済' : '📋 コピー'}
                  </button>
                </div>
                <textarea readOnly value={t.tsv} style={{
                  width: '100%', height: 80, border: '1px solid #ddd', borderRadius: 8,
                  padding: 8, fontSize: 10, fontFamily: 'monospace', resize: 'vertical',
                  boxSizing: 'border-box', whiteSpace: 'pre', overflowX: 'auto',
                }} />
              </div>
            ))}
          </>
        )}

        {mode === 'export' && (
          <>
            <textarea readOnly value={exportData} style={{
              width: '100%', height: 200, border: '1px solid #ddd', borderRadius: 8,
              padding: 10, fontSize: 11, fontFamily: 'monospace', resize: 'vertical',
            }} />
            <button onClick={handleCopy} style={{
              width: '100%', padding: '10px 0', background: '#3D3D3D', color: '#fff',
              border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit', marginTop: 8,
            }}>📋 コピー</button>
          </>
        )}

        {mode === 'import' && (
          <>
            <textarea value={jsonText} onChange={(e) => setJsonText(e.target.value)}
              placeholder="エクスポートしたJSONをペースト" style={{
                width: '100%', height: 200, border: '1px solid #ddd', borderRadius: 8,
                padding: 10, fontSize: 11, fontFamily: 'monospace', resize: 'vertical',
              }} />
            <button onClick={handleImport} style={{
              width: '100%', padding: '10px 0', background: '#2D6A4F', color: '#fff',
              border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit', marginTop: 8,
            }}>📥 インポート</button>
          </>
        )}

        <button onClick={onClose} style={{
          width: '100%', padding: '10px 0', background: '#f0f0f0', color: '#555',
          border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600,
          cursor: 'pointer', fontFamily: 'inherit', marginTop: 8,
        }}>閉じる</button>
      </div>
    </div>
  );
}
