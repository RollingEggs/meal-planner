import React, { useState } from 'react';
import { getSyncUrl, setSyncUrl } from '../sheets';

export default function SettingsModal({ data, onImport, onClose }) {
  const [jsonText, setJsonText] = useState('');
  const [mode, setMode] = useState('sync');
  const [syncUrl, setSyncUrlState] = useState(getSyncUrl());
  const [saved, setSaved] = useState(false);

  const exportData = JSON.stringify(data, null, 2);

  const handleImport = () => {
    try {
      const parsed = JSON.parse(jsonText);
      if (parsed && parsed.recipes && parsed.genres) {
        onImport(parsed);
        onClose();
      } else {
        alert('データ形式が正しくありません');
      }
    } catch {
      alert('JSONの解析に失敗しました');
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(exportData).then(() => {
      alert('コピーしました');
    }).catch(() => {});
  };

  const handleSaveUrl = () => {
    setSyncUrl(syncUrl.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const btnStyle = (active) => ({
    flex: 1, padding: '8px 0',
    border: `2px solid ${active ? '#3D3D3D' : '#ddd'}`,
    borderRadius: 8,
    background: active ? '#3D3D3D' : '#fff',
    color: active ? '#fff' : '#666',
    fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
  });

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

        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <button onClick={() => setMode('sync')} style={btnStyle(mode === 'sync')}>同期設定</button>
          <button onClick={() => setMode('export')} style={btnStyle(mode === 'export')}>エクスポート</button>
          <button onClick={() => setMode('import')} style={btnStyle(mode === 'import')}>インポート</button>
        </div>

        {mode === 'sync' && (
          <>
            <p style={{ fontSize: 12, color: '#666', marginBottom: 10, lineHeight: 1.6 }}>
              Google Apps Script の Web アプリ URL を入力してください。
              このデバイスのみに保存され、コードには含まれません。
            </p>
            <input
              type="url"
              value={syncUrl}
              onChange={(e) => { setSyncUrlState(e.target.value); setSaved(false); }}
              placeholder="https://script.google.com/macros/s/..."
              style={{
                width: '100%', padding: '10px 12px', border: '1px solid #ddd',
                borderRadius: 8, fontSize: 13, fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
            />
            <button onClick={handleSaveUrl} style={{
              width: '100%', padding: '10px 0',
              background: saved ? '#2D6A4F' : '#3D3D3D',
              color: '#fff', border: 'none', borderRadius: 8,
              fontSize: 14, fontWeight: 700, cursor: 'pointer',
              fontFamily: 'inherit', marginTop: 8, transition: 'background 0.2s',
            }}>
              {saved ? '✓ 保存しました' : '保存'}
            </button>
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
