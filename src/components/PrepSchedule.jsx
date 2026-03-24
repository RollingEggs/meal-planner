import React, { useMemo } from 'react';
import { LABEL_WIDTH } from '../constants';

export default function PrepSchedule({ dates, scheduled, recipes, genres, colWidth }) {

  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const dateIndex = useMemo(() => {
    const map = {};
    dates.forEach((d, i) => { map[d] = i; });
    return map;
  }, [dates]);

  const prepItems = useMemo(() => {
    return scheduled
      .filter((s) => !s.noPrep && s.prepDate)
      .map((s) => {
        const recipe = recipes.find((r) => r.id === s.recipeId);
        const genre = recipe ? genres.find((g) => g.id === recipe.genreId) : null;
        return { ...s, recipe, genre };
      })
      .filter((s) => dateIndex[s.prepDate] != null);
  }, [scheduled, recipes, genres, dateIndex]);

  const totalWidth = dates.length * colWidth;
  const ROW_HEIGHT = 32;

  return (
    <div style={{ marginBottom: 2 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
        background: '#F5F0E8', borderRadius: '10px 10px 0 0',
      }}>
        <span style={{ fontWeight: 700, fontSize: 14 }}>🔪 作業スケジュール</span>
        <span style={{
          background: '#3D3D3D', color: '#fff', fontSize: 10, padding: '1px 8px',
          borderRadius: 10, fontWeight: 700,
        }}>{prepItems.length}</span>
      </div>
      <div
        id="prep-scroll"
        style={{
          overflowX: 'auto', overflowY: 'hidden', WebkitOverflowScrolling: 'touch',
          background: '#fff', borderRadius: '0 0 10px 10px', border: '1px solid #eee', borderTop: 'none',
        }}
      >
        <div style={{ display: 'flex', minWidth: totalWidth + LABEL_WIDTH }}>
          <div style={{ width: LABEL_WIDTH, flexShrink: 0, position: 'sticky', left: 0, zIndex: 2, background: '#fff' }}>
            <div style={{ height: ROW_HEIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🔪</div>
          </div>
          <div style={{ position: 'relative', flex: 1 }}>
            <div style={{ position: 'relative', height: ROW_HEIGHT }}>
              {/* Column grid */}
              <div style={{ display: 'flex', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none' }}>
                {dates.map((d) => (
                  <div key={d} style={{
                    width: colWidth, flexShrink: 0, borderRight: '1px solid #f5f5f5',
                    background: d === todayStr ? '#3D3D3D08' : 'transparent',
                  }} />
                ))}
              </div>
              {/* Prep items */}
              {prepItems.map((item) => {
                const colIdx = dateIndex[item.prepDate];
                if (colIdx == null) return null;
                const left = colIdx * colWidth;
                const gc = item.genre ? item.genre.color : '#6C757D';
                return (
                  <div key={item.id + '-prep'} style={{
                    position: 'absolute', top: 4, left: left + 2,
                    width: colWidth - 4, height: ROW_HEIGHT - 8,
                    background: `repeating-linear-gradient(45deg, ${gc}08, ${gc}08 4px, ${gc}14 4px, ${gc}14 8px)`,
                    border: `1.5px dashed ${gc}88`, borderRadius: 5,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 9, color: gc, fontWeight: 600, overflow: 'hidden',
                    whiteSpace: 'nowrap', gap: 2, cursor: 'default',
                  }} title={`🔪 ${item.recipe?.name || '?'} (${item.prepDate})`}>
                    <span>🔪</span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.recipe?.name || '?'}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
