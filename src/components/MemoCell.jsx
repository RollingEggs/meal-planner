import React, { useState } from 'react';

export default function MemoCell({ dateStr, value, onChange }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value || '');

  const handleBlur = () => {
    setEditing(false);
    if (text !== (value || '')) onChange(dateStr, text);
  };

  if (editing) {
    return (
      <input
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
        style={{
          width: '100%', height: '100%', border: 'none', outline: 'none',
          background: '#FFF8E1', fontSize: 10, textAlign: 'center',
          fontFamily: 'inherit', padding: '0 2px',
        }}
      />
    );
  }

  return (
    <div
      onClick={() => { setText(value || ''); setEditing(true); }}
      style={{
        width: '100%', height: '100%', display: 'flex', alignItems: 'center',
        justifyContent: 'center', cursor: 'pointer', fontSize: 9,
        background: value ? '#FFF3E0' : 'transparent',
        borderRadius: value ? 4 : 0,
        color: value ? '#E65100' : '#999',
        fontWeight: value ? 700 : 400,
        overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
      }}
      title={value || 'メモを追加'}
    >
      {value || '…'}
    </div>
  );
}
