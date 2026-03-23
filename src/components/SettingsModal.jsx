import React, { useState } from 'react';

export default function SettingsModal({ data, onImport, onClose }) {
  const [jsonText, setJsonText] = useState('');
  const [mode, setMode] = useState('export');

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
    }).catch(() => {
      // textarea is there for manual copy
    });
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
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>⚙ データ管理</div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <button onClick={() => setMode('export')} style={{
            flex: 1, padding: '8px 0', border: `2px solid ${mode === 'export' ? '#3D3D3D' : '#ddd'}`,
            borderRadius: 8, background: mode === 'export' ? '#3D3D3D' : '#fff',
            color: mode === 'export' ? '#fff' : '#666', fontSize: 13, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit',
          }}>エクスポート</button>
          <button onClick={() => setMode('import')} style={{
            flex: 1, padding: '8px 0', border: `2px solid ${mode === 'import' ? '#3D3D3D' : '#ddd'}`,
            borderRadius: 8, background: mode === 'import' ? '#3D3D3D' : '#fff',
            color: mode === 'import' ? '#fff' : '#666', fontSize: 13, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit',
          }}>インポート</button>
        </div>

        {mode === 'export' ? (
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
        ) : (
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
