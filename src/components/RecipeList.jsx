import React, { useState } from 'react';

export default function RecipeList({ recipes, genres, dragState, setDragState }) {
  const [collapsed, setCollapsed] = useState(false);
  const [filter, setFilter] = useState('all');

  const filtered = filter === 'all' ? recipes : recipes.filter((r) => r.genreId === filter);

  const handleDragStart = (e, recipeId) => {
    e.dataTransfer.effectAllowed = 'copy';
    setDragState({ type: 'new', recipeId });
  };

  const handleTouchStart = (e, recipeId) => {
    const touch = e.touches[0];
    setDragState({ type: 'new', recipeId, ghostX: touch.clientX, ghostY: touch.clientY });
  };

  const getGenre = (gid) => genres.find((g) => g.id === gid);

  return (
    <div>
      <div onClick={() => setCollapsed(!collapsed)} style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
        background: '#F5F0E8', cursor: 'pointer', borderRadius: collapsed ? 10 : '10px 10px 0 0',
      }}>
        <span style={{ fontSize: 12, color: '#888' }}>{collapsed ? '▶' : '▼'}</span>
        <span style={{ fontWeight: 700, fontSize: 14 }}>🧑‍🍳 レシピ一覧</span>
        <span style={{
          background: '#3D3D3D', color: '#fff', fontSize: 10, padding: '1px 8px',
          borderRadius: 10, fontWeight: 700,
        }}>{recipes.length}</span>
      </div>
      {!collapsed && (
        <div style={{
          background: '#fff', borderRadius: '0 0 10px 10px', border: '1px solid #eee',
          borderTop: 'none', padding: '8px 10px',
        }}>
          {/* Genre filter */}
          <div style={{
            display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 8,
            WebkitOverflowScrolling: 'touch',
          }}>
            <button onClick={() => setFilter('all')} style={{
              padding: '4px 12px', borderRadius: 20, border: `1.5px solid ${filter === 'all' ? '#3D3D3D' : '#ddd'}`,
              background: filter === 'all' ? '#3D3D3D' : '#fff',
              color: filter === 'all' ? '#fff' : '#888',
              fontSize: 11, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit', flexShrink: 0,
            }}>全て</button>
            {genres.map((g) => (
              <button key={g.id} onClick={() => setFilter(g.id)} style={{
                padding: '4px 12px', borderRadius: 20, border: `1.5px solid ${filter === g.id ? g.color : '#ddd'}`,
                background: filter === g.id ? g.color + '22' : '#fff',
                color: filter === g.id ? g.color : '#888',
                fontSize: 11, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit', flexShrink: 0,
              }}>{g.name}</button>
            ))}
          </div>

          {/* Cards 2 columns */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {filtered.map((r) => {
              const g = getGenre(r.genreId);
              const gc = g ? g.color : '#6C757D';
              return (
                <div
                  key={r.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, r.id)}
                  onTouchStart={(e) => handleTouchStart(e, r.id)}
                  style={{
                    padding: '8px 10px', background: gc + '0D', border: `1.5px solid ${gc}33`,
                    borderRadius: 10, cursor: 'grab', touchAction: 'none',
                  }}
                >
                  <span style={{
                    fontSize: 9, background: gc + '22', color: gc, padding: '1px 6px',
                    borderRadius: 8, fontWeight: 700, display: 'inline-block', marginBottom: 3,
                  }}>{g ? g.name : 'その他'}</span>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#333' }}>{r.name}</div>
                </div>
              );
            })}
          </div>
          {filtered.length === 0 && (
            <div style={{ padding: 16, textAlign: 'center', color: '#aaa', fontSize: 13 }}>
              レシピがありません
            </div>
          )}
        </div>
      )}
    </div>
  );
}
