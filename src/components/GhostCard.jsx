import React, { useMemo } from 'react';
import { MEAL_TIMES, getDayOfWeek } from '../constants';

export default function GhostCard({ dragState, recipes, genres }) {
  const info = useMemo(() => {
    if (!dragState) return null;
    const recipeId = dragState.recipeId || (() => {
      return null;
    })();
    if (!recipeId) return null;
    const recipe = recipes.find((r) => r.id === recipeId);
    const genre = recipe ? genres.find((g) => g.id === recipe.genreId) : null;
    return { recipe, genre };
  }, [dragState, recipes, genres]);

  if (!dragState || (!dragState.ghostX && !dragState.ghostY)) return null;
  if (!info || !info.recipe) return null;

  const gc = info.genre ? info.genre.color : '#6C757D';
  const hoverDate = dragState.hoverDate;
  const hoverLane = dragState.hoverLane;
  const mt = MEAL_TIMES.find((m) => m.key === hoverLane);

  return (
    <div style={{
      position: 'fixed',
      left: (dragState.ghostX || 0) + 12,
      top: (dragState.ghostY || 0) - 20,
      zIndex: 99999, pointerEvents: 'none',
    }}>
      <div style={{
        background: gc + '22', border: `2px solid ${gc}`, borderRadius: 8,
        padding: '4px 10px', fontSize: 12, fontWeight: 700, color: gc,
        whiteSpace: 'nowrap', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      }}>
        {info.recipe.name}
      </div>
      {hoverDate ? (
        <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
          <span style={{
            background: '#fff', border: '1px solid #ddd', borderRadius: 6,
            padding: '1px 6px', fontSize: 10, fontWeight: 600,
          }}>
            📅 {new Date(hoverDate).getMonth() + 1}/{new Date(hoverDate).getDate()}({getDayOfWeek(hoverDate)})
          </span>
          {mt && (
            <span style={{
              background: mt.color + '22', color: mt.color, border: `1px solid ${mt.color}44`,
              borderRadius: 6, padding: '1px 6px', fontSize: 10, fontWeight: 600,
            }}>
              {mt.icon}{mt.label}
            </span>
          )}
        </div>
      ) : (
        <div style={{
          marginTop: 4, fontSize: 10, color: '#888', background: '#fff',
          padding: '2px 6px', borderRadius: 4,
        }}>
          献立エリアにドロップ
        </div>
      )}
    </div>
  );
}
