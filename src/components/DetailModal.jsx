import React from 'react';
import { MEAL_TIMES, addDays } from '../constants';

export default function DetailModal({ item, recipes, genres, onUpdate, onDelete, onClose }) {
  if (!item) return null;
  const recipe = recipes.find((r) => r.id === item.recipeId);
  const genre = genres.find((g) => g.id === (recipe ? recipe.genreId : ''));
  const genreColor = genre ? genre.color : '#6C757D';

  const prepOptions = [
    { key: 'prev', label: '📅 前日に作業', desc: 'デフォルト' },
    { key: 'same', label: '⏰ 当日に作業', desc: '' },
    { key: 'none', label: '🛒 作業なし', desc: '購入品・惣菜' },
    { key: 'custom', label: '📆 日付を指定', desc: '' },
  ];

  const currentPrepKey = item.noPrep ? 'none'
    : item.prepDate === item.startDate ? 'same'
    : item.prepDate && item.prepDate !== addDays(item.startDate, -1) ? 'custom'
    : 'prev';

  const handleMealTime = (mt) => {
    onUpdate({ ...item, mealTime: mt });
  };

  const handleEndDate = (e) => {
    const val = e.target.value;
    if (val >= item.startDate) {
      onUpdate({ ...item, endDate: val });
    }
  };

  const handlePrepOption = (key) => {
    if (key === 'prev') {
      onUpdate({ ...item, noPrep: false, prepDate: addDays(item.startDate, -1) });
    } else if (key === 'same') {
      onUpdate({ ...item, noPrep: false, prepDate: item.startDate });
    } else if (key === 'none') {
      onUpdate({ ...item, noPrep: true, prepDate: null });
    } else if (key === 'custom') {
      onUpdate({ ...item, noPrep: false, prepDate: item.prepDate || addDays(item.startDate, -1) });
    }
  };

  const handleCustomPrepDate = (e) => {
    onUpdate({ ...item, noPrep: false, prepDate: e.target.value });
  };

  const overlay = {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.4)', zIndex: 9999,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 16,
  };

  const modal = {
    background: '#fff', borderRadius: 16, width: '100%', maxWidth: 400,
    maxHeight: '85vh', overflow: 'auto', padding: 20,
    boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
  };

  const section = { marginBottom: 16 };
  const sectionTitle = { fontSize: 13, fontWeight: 700, marginBottom: 8, color: '#555' };

  return (
    <div style={overlay} onClick={onClose}>
      <div style={modal} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              background: genreColor + '22', color: genreColor, padding: '2px 10px',
              borderRadius: 12, fontSize: 12, fontWeight: 700, border: `1px solid ${genreColor}44`,
            }}>{genre ? genre.name : 'その他'}</span>
            <span style={{ fontWeight: 700, fontSize: 16 }}>{recipe ? recipe.name : '不明'}</span>
          </div>
        </div>

        <div style={section}>
          <div style={sectionTitle}>🕐 食事タイミング</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {MEAL_TIMES.map((mt) => (
              <button key={mt.key} onClick={() => handleMealTime(mt.key)} style={{
                flex: 1, padding: '8px 0', border: `2px solid ${item.mealTime === mt.key ? mt.color : '#ddd'}`,
                borderRadius: 10, background: item.mealTime === mt.key ? mt.color + '18' : '#fff',
                cursor: 'pointer', fontSize: 14, fontFamily: 'inherit', fontWeight: 600,
                color: item.mealTime === mt.key ? mt.color : '#888',
              }}>
                {mt.icon} {mt.label}
                {item.mealTime === mt.key && ' ✓'}
              </button>
            ))}
          </div>
        </div>

        <div style={section}>
          <div style={sectionTitle}>📏 期間（作り置き）</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: '#999', marginBottom: 2 }}>開始日</div>
              <div style={{
                padding: '6px 10px', background: '#f5f5f5', borderRadius: 8, fontSize: 13,
                color: '#555',
              }}>{item.startDate}</div>
            </div>
            <span style={{ fontSize: 18, color: '#ccc', marginTop: 14 }}>→</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: '#999', marginBottom: 2 }}>終了日</div>
              <input type="date" value={item.endDate} onChange={handleEndDate}
                min={item.startDate}
                style={{
                  padding: '6px 10px', border: '1px solid #ddd', borderRadius: 8,
                  fontSize: 13, fontFamily: 'inherit', width: '100%',
                }}
              />
            </div>
          </div>
        </div>

        <div style={section}>
          <div style={sectionTitle}>🔪 作業設定</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {prepOptions.map((opt) => (
              <button key={opt.key} onClick={() => handlePrepOption(opt.key)} style={{
                padding: '10px 12px', border: `2px solid ${currentPrepKey === opt.key ? genreColor : '#eee'}`,
                borderRadius: 10, background: currentPrepKey === opt.key ? genreColor + '12' : '#fff',
                cursor: 'pointer', fontSize: 13, fontFamily: 'inherit', textAlign: 'left',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                color: currentPrepKey === opt.key ? genreColor : '#555',
                fontWeight: currentPrepKey === opt.key ? 700 : 400,
              }}>
                <span>{opt.label} {opt.desc && <span style={{ fontSize: 11, color: '#aaa' }}>({opt.desc})</span>}</span>
                {currentPrepKey === opt.key && <span style={{ color: genreColor }}>✓</span>}
              </button>
            ))}
            {currentPrepKey === 'custom' && (
              <input type="date" value={item.prepDate || ''} onChange={handleCustomPrepDate}
                style={{
                  padding: '8px 10px', border: `1px solid ${genreColor}66`, borderRadius: 8,
                  fontSize: 13, fontFamily: 'inherit', marginTop: 4,
                }}
              />
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
          <button onClick={() => { onDelete(item.id); onClose(); }} style={{
            flex: 1, padding: '12px 0', background: '#DC2626', color: '#fff', border: 'none',
            borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          }}>スケジュールから削除</button>
          <button onClick={onClose} style={{
            flex: 1, padding: '12px 0', background: '#f0f0f0', color: '#555', border: 'none',
            borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
          }}>閉じる</button>
        </div>
      </div>
    </div>
  );
}
