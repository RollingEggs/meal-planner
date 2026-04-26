import React, { useState } from 'react';

const PALETTE = [
  '#C84B31','#2D6A4F','#E76F51','#D62828','#6A5ACD',
  '#52B788','#4A90D9','#B5838D','#D4A017','#6C757D',
  '#E91E63','#9C27B0','#00BCD4','#FF9800','#795548',
  '#607D8B','#F44336','#3F51B5','#009688','#CDDC39',
];

export default function RecipeManager({ data, onUpdate }) {
  const { recipes, genres } = data;
  const [recipeName, setRecipeName] = useState('');
  const [selectedGenre, setSelectedGenre] = useState(genres[0]?.id || '');
  const [newGenreName, setNewGenreName] = useState('');
  const [newGenreColor, setNewGenreColor] = useState(PALETTE[0]);
  const [showGenreAdd, setShowGenreAdd] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState(null);
  const [editName, setEditName] = useState('');
  const [editGenre, setEditGenre] = useState('');
  const [confirmDeleteRecipeId, setConfirmDeleteRecipeId] = useState(null);
  const [confirmDeleteGenreId, setConfirmDeleteGenreId] = useState(null);

  const genId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

  const addRecipe = () => {
    if (!recipeName.trim() || genres.length === 0) return;
    const genreId = selectedGenre || genres[0].id;
    const newR = { id: genId(), name: recipeName.trim(), genreId };
    onUpdate({ ...data, recipes: [...recipes, newR] });
    setRecipeName('');
  };

  const confirmDeleteRecipe = () => {
    if (!confirmDeleteRecipeId) return;
    onUpdate({
      ...data,
      recipes: recipes.filter((r) => r.id !== confirmDeleteRecipeId),
      scheduled: data.scheduled.filter((s) => s.recipeId !== confirmDeleteRecipeId),
    });
    setConfirmDeleteRecipeId(null);
  };

  const startEdit = (r) => {
    setEditingRecipe(r.id);
    setEditName(r.name);
    setEditGenre(r.genreId);
  };

  const saveEdit = () => {
    if (!editName.trim()) return;
    onUpdate({
      ...data,
      recipes: recipes.map((r) => r.id === editingRecipe ? { ...r, name: editName.trim(), genreId: editGenre } : r),
    });
    setEditingRecipe(null);
  };

  const addGenre = () => {
    if (!newGenreName.trim()) return;
    const newG = { id: genId(), name: newGenreName.trim(), color: newGenreColor };
    onUpdate({ ...data, genres: [...genres, newG] });
    setNewGenreName('');
    setShowGenreAdd(false);
  };

  const confirmDeleteGenre = () => {
    if (!confirmDeleteGenreId) return;
    const id = confirmDeleteGenreId;
    const remaining = genres.filter((g) => g.id !== id);
    const fallback = remaining.find((g) => g.name === 'その他') || remaining.find((g) => g.id === 'g10') || remaining[0];
    if (!fallback) { setConfirmDeleteGenreId(null); return; }
    onUpdate({
      ...data,
      genres: remaining,
      recipes: recipes.map((r) => r.genreId === id ? { ...r, genreId: fallback.id } : r),
    });
    setConfirmDeleteGenreId(null);
  };

  const sectionStyle = {
    background: '#F5F0E8', borderRadius: 12, padding: 14, marginBottom: 14,
  };
  const sectionTitle = { fontSize: 14, fontWeight: 700, marginBottom: 10, color: '#555' };
  const inputStyle = {
    padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8,
    fontSize: 14, fontFamily: 'inherit', outline: 'none', width: '100%',
  };
  const btnStyle = {
    padding: '8px 16px', border: 'none', borderRadius: 8, fontSize: 13,
    fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
  };

  const confirmModalStyle = {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.4)', zIndex: 9999,
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
  };

  return (
    <div style={{ padding: '12px 0' }}>
      {/* レシピ登録 */}
      <div style={sectionStyle}>
        <div style={sectionTitle}>🍳 レシピ登録</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <input value={recipeName} onChange={(e) => setRecipeName(e.target.value)}
            placeholder="レシピ名" style={{ ...inputStyle, flex: 1 }}
            onKeyDown={(e) => { if (e.key === 'Enter') addRecipe(); }}
          />
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select value={selectedGenre} onChange={(e) => setSelectedGenre(e.target.value)}
            style={{ ...inputStyle, flex: 1 }}>
            {genres.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
          <button onClick={addRecipe} style={{ ...btnStyle, background: '#3D3D3D', color: '#fff', whiteSpace: 'nowrap' }}>
            ＋追加
          </button>
        </div>
      </div>

      {/* ジャンル管理 */}
      <div style={sectionStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={sectionTitle}>🏷️ ジャンル管理</div>
          <button onClick={() => setShowGenreAdd(!showGenreAdd)}
            style={{ ...btnStyle, background: '#3D3D3D', color: '#fff', fontSize: 12 }}>
            ＋追加
          </button>
        </div>
        {showGenreAdd && (
          <div style={{ background: '#fff', borderRadius: 10, padding: 12, marginBottom: 10 }}>
            <input value={newGenreName} onChange={(e) => setNewGenreName(e.target.value)}
              placeholder="ジャンル名" style={{ ...inputStyle, marginBottom: 8 }}
              onKeyDown={(e) => { if (e.key === 'Enter') addGenre(); }}
            />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
              {PALETTE.map((c) => (
                <div key={c} onClick={() => setNewGenreColor(c)} style={{
                  width: 28, height: 28, borderRadius: 8, background: c, cursor: 'pointer',
                  border: newGenreColor === c ? '3px solid #333' : '2px solid transparent',
                }} />
              ))}
            </div>
            <button onClick={addGenre} style={{ ...btnStyle, background: newGenreColor, color: '#fff', width: '100%' }}>追加</button>
          </div>
        )}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {genres.map((g) => (
            <div key={g.id} style={{
              display: 'flex', alignItems: 'center', gap: 4, background: g.color + '18',
              border: `1px solid ${g.color}44`, borderRadius: 20, padding: '4px 10px',
            }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: g.color, display: 'inline-block' }} />
              <span style={{ fontSize: 12, color: g.color, fontWeight: 600 }}>{g.name}</span>
              {g.id !== 'g10' && g.name !== 'その他' && (
                <span onClick={() => setConfirmDeleteGenreId(g.id)} style={{
                  cursor: 'pointer', fontSize: 14, color: '#999', marginLeft: 2, lineHeight: 1,
                }}>×</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* レシピ一覧 */}
      <div style={sectionStyle}>
        <div style={sectionTitle}>📋 登録済みレシピ ({recipes.length})</div>
        {recipes.length === 0 && <div style={{ color: '#aaa', fontSize: 13 }}>レシピがありません</div>}
        {recipes.map((r) => {
          const g = genres.find((gen) => gen.id === r.genreId);
          const gc = g ? g.color : '#6C757D';
          return (
            <div key={r.id} style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
              background: '#fff', borderRadius: 10, marginBottom: 6,
              borderLeft: `4px solid ${gc}`,
            }}>
              <span style={{
                fontSize: 10, background: gc + '22', color: gc, padding: '1px 8px',
                borderRadius: 10, fontWeight: 700, whiteSpace: 'nowrap',
              }}>{g ? g.name : 'その他'}</span>
              <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{r.name}</span>
              <button onClick={() => startEdit(r)} style={{
                background: 'none', border: '1px solid #ddd', borderRadius: 6,
                fontSize: 11, padding: '2px 8px', cursor: 'pointer', fontFamily: 'inherit', color: '#666',
              }}>編集</button>
              <button onClick={() => setConfirmDeleteRecipeId(r.id)} style={{
                background: 'none', border: '1px solid #fcc', borderRadius: 6,
                fontSize: 11, padding: '2px 8px', cursor: 'pointer', fontFamily: 'inherit', color: '#D32F2F',
              }}>削除</button>
            </div>
          );
        })}
      </div>

      {/* 編集モーダル */}
      {editingRecipe && (
        <div style={confirmModalStyle} onClick={() => setEditingRecipe(null)}>
          <div style={{
            background: '#fff', borderRadius: 16, padding: 20, width: '100%', maxWidth: 360,
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>レシピ編集</div>
            <input value={editName} onChange={(e) => setEditName(e.target.value)}
              style={{ ...inputStyle, marginBottom: 10 }}
              onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); }}
            />
            <select value={editGenre} onChange={(e) => setEditGenre(e.target.value)}
              style={{ ...inputStyle, marginBottom: 14 }}>
              {genres.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={saveEdit} style={{ ...btnStyle, flex: 1, background: '#3D3D3D', color: '#fff' }}>保存</button>
              <button onClick={() => setEditingRecipe(null)} style={{ ...btnStyle, flex: 1, background: '#eee', color: '#555' }}>キャンセル</button>
            </div>
          </div>
        </div>
      )}

      {/* レシピ削除確認モーダル */}
      {confirmDeleteRecipeId && (
        <div style={confirmModalStyle} onClick={() => setConfirmDeleteRecipeId(null)}>
          <div style={{
            background: '#fff', borderRadius: 16, padding: 20, width: '100%', maxWidth: 320,
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>レシピを削除しますか？</div>
            <div style={{ fontSize: 13, color: '#666', marginBottom: 16 }}>スケジュールからも削除されます。</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={confirmDeleteRecipe} style={{ ...btnStyle, flex: 1, background: '#DC2626', color: '#fff' }}>削除</button>
              <button onClick={() => setConfirmDeleteRecipeId(null)} style={{ ...btnStyle, flex: 1, background: '#eee', color: '#555' }}>キャンセル</button>
            </div>
          </div>
        </div>
      )}

      {/* ジャンル削除確認モーダル */}
      {confirmDeleteGenreId && (
        <div style={confirmModalStyle} onClick={() => setConfirmDeleteGenreId(null)}>
          <div style={{
            background: '#fff', borderRadius: 16, padding: 20, width: '100%', maxWidth: 320,
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>ジャンルを削除しますか？</div>
            <div style={{ fontSize: 13, color: '#666', marginBottom: 16 }}>このジャンルのレシピは「その他」に移動します。</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={confirmDeleteGenre} style={{ ...btnStyle, flex: 1, background: '#DC2626', color: '#fff' }}>削除</button>
              <button onClick={() => setConfirmDeleteGenreId(null)} style={{ ...btnStyle, flex: 1, background: '#eee', color: '#555' }}>キャンセル</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
