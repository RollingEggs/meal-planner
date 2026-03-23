import React, { useState, useMemo } from 'react';
import { MEAL_TIMES, COL_WIDTH, LANE_HEIGHT, HEADER_HEIGHT, MEMO_ROW_HEIGHT, LABEL_WIDTH } from '../constants';
import MemoCell from './MemoCell';

export default function GanttChart({
  dates, scheduled, recipes, genres, memos,
  onMemoChange, onItemTap, onDropRecipe, onMoveItem, onResizeItem,
  dragState, setDragState,
}) {
  const [collapsed, setCollapsed] = useState(false);
  const todayStr = useMemo(() => {
    const d = new Date(); const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  }, []);

  const dateIndex = useMemo(() => {
    const map = {};
    dates.forEach((d, i) => { map[d] = i; });
    return map;
  }, [dates]);

  const totalWidth = dates.length * COL_WIDTH;
  const ganttBodyHeight = LANE_HEIGHT * 3;

  const getGenreColor = (recipeId) => {
    const r = recipes.find((rec) => rec.id === recipeId);
    const g = r ? genres.find((gen) => gen.id === r.genreId) : null;
    return g ? g.color : '#6C757D';
  };

  const getRecipeName = (recipeId) => {
    const r = recipes.find((rec) => rec.id === recipeId);
    return r ? r.name : '?';
  };

  const getMealTimeIdx = (mt) => MEAL_TIMES.findIndex((m) => m.key === mt);

  // Eventing helpers for drag/drop
  const getDateAndLaneFromPosition = (clientX, clientY, scrollEl) => {
    if (!scrollEl) return { date: null, lane: null };
    const rect = scrollEl.getBoundingClientRect();
    const scrollLeft = scrollEl.scrollLeft;
    const x = clientX - rect.left + scrollLeft - LABEL_WIDTH;
    const y = clientY - rect.top - HEADER_HEIGHT - MEMO_ROW_HEIGHT;
    const colIdx = Math.floor(x / COL_WIDTH);
    const laneIdx = Math.min(2, Math.max(0, Math.floor(y / LANE_HEIGHT)));
    const date = dates[colIdx] || null;
    const lane = MEAL_TIMES[laneIdx]?.key || null;
    return { date, lane, colIdx, laneIdx };
  };

  // Handle drop from recipe list
  const handleDrop = (e) => {
    const scrollEl = e.currentTarget;
    const clientX = e.clientX || (e.changedTouches && e.changedTouches[0].clientX);
    const clientY = e.clientY || (e.changedTouches && e.changedTouches[0].clientY);
    const { date, lane } = getDateAndLaneFromPosition(clientX, clientY, scrollEl);
    if (date && lane && dragState && dragState.type === 'new') {
      onDropRecipe(dragState.recipeId, date, lane);
    }
    if (date && lane && dragState && dragState.type === 'move') {
      onMoveItem(dragState.itemId, date, lane);
    }
    setDragState(null);
  };

  // Touch/mouse move for existing bars
  const handleBarDragStart = (e, item, action) => {
    e.stopPropagation();
    const clientX = e.clientX ?? e.touches?.[0]?.clientX;
    const clientY = e.clientY ?? e.touches?.[0]?.clientY;
    if (action === 'resize') {
      setDragState({ type: 'resize', itemId: item.id, startX: clientX, origEnd: item.endDate });
    } else {
      setDragState({ type: 'move', itemId: item.id, recipeId: item.recipeId, startX: clientX, startY: clientY });
    }
  };

  const scheduleCount = scheduled.length;

  // highlight column
  const highlightCol = dragState?.hoverColIdx;
  const highlightLane = dragState?.hoverLaneIdx;
  const highlightColor = dragState?.recipeId ? getGenreColor(dragState.recipeId)
    : dragState?.itemId ? getGenreColor(scheduled.find(s => s.id === dragState.itemId)?.recipeId) : null;

  return (
    <div style={{ marginBottom: 2 }}>
      <div onClick={() => setCollapsed(!collapsed)} style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
        background: '#F5F0E8', cursor: 'pointer', borderRadius: collapsed ? 10 : '10px 10px 0 0',
      }}>
        <span style={{ fontSize: 12, color: '#888' }}>{collapsed ? '▶' : '▼'}</span>
        <span style={{ fontWeight: 700, fontSize: 14 }}>📅 献立スケジュール</span>
        <span style={{
          background: '#3D3D3D', color: '#fff', fontSize: 10, padding: '1px 8px',
          borderRadius: 10, fontWeight: 700,
        }}>{scheduleCount}</span>
      </div>
      {!collapsed && (
        <div
          id="gantt-scroll"
          onDragOver={(e) => {
            e.preventDefault();
            const { colIdx, laneIdx, date, lane } = getDateAndLaneFromPosition(e.clientX, e.clientY, e.currentTarget);
            if (dragState) {
              setDragState((prev) => ({ ...prev, hoverColIdx: colIdx, hoverLaneIdx: laneIdx, hoverDate: date, hoverLane: lane }));
            }
          }}
          onDrop={handleDrop}
          onTouchMove={(e) => {
            if (!dragState) return;
            const touch = e.touches[0];
            const scrollEl = document.getElementById('gantt-scroll');
            const { colIdx, laneIdx, date, lane } = getDateAndLaneFromPosition(touch.clientX, touch.clientY, scrollEl);
            setDragState((prev) => prev ? ({ ...prev, hoverColIdx: colIdx, hoverLaneIdx: laneIdx, hoverDate: date, hoverLane: lane, ghostX: touch.clientX, ghostY: touch.clientY }) : prev);
          }}
          onTouchEnd={(e) => {
            if (!dragState) return;
            const touch = e.changedTouches[0];
            const scrollEl = document.getElementById('gantt-scroll');
            const { date, lane } = getDateAndLaneFromPosition(touch.clientX, touch.clientY, scrollEl);
            if (date && lane) {
              if (dragState.type === 'new') onDropRecipe(dragState.recipeId, date, lane);
              if (dragState.type === 'move') onMoveItem(dragState.itemId, date, lane);
              if (dragState.type === 'resize') {
                onResizeItem(dragState.itemId, date);
              }
            }
            setDragState(null);
          }}
          style={{
            overflowX: 'auto', overflowY: 'hidden', WebkitOverflowScrolling: 'touch',
            background: '#fff', borderRadius: '0 0 10px 10px', border: '1px solid #eee',
            borderTop: 'none', position: 'relative',
          }}
        >
          <div style={{ display: 'flex', minWidth: totalWidth + LABEL_WIDTH }}>
            {/* Lane labels */}
            <div style={{ width: LABEL_WIDTH, flexShrink: 0, position: 'sticky', left: 0, zIndex: 3, background: '#fff' }}>
              <div style={{ height: HEADER_HEIGHT }} />
              <div style={{ height: MEMO_ROW_HEIGHT }} />
              {MEAL_TIMES.map((mt) => (
                <div key={mt.key} style={{
                  height: LANE_HEIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, color: mt.color + '88', fontWeight: 600, flexDirection: 'column', lineHeight: 1,
                }}>
                  <span style={{ fontSize: 14 }}>{mt.icon}</span>
                </div>
              ))}
            </div>

            {/* Grid */}
            <div style={{ position: 'relative', flex: 1 }}>
              {/* Date header */}
              <div style={{ display: 'flex', height: HEADER_HEIGHT }}>
                {dates.map((d, i) => {
                  const dow = new Date(d).getDay();
                  const isToday = d === todayStr;
                  const isHighlight = highlightCol === i && dragState;
                  return (
                    <div key={d} style={{
                      width: COL_WIDTH, flexShrink: 0, textAlign: 'center',
                      borderRight: '1px solid #f0f0f0',
                      background: isHighlight ? (highlightColor + '22') : isToday ? '#3D3D3D' : '#FAFAF8',
                      color: isHighlight ? highlightColor : isToday ? '#fff' : dow === 0 ? '#DC2626' : dow === 6 ? '#2563EB' : '#666',
                      display: 'flex', flexDirection: 'column', justifyContent: 'center',
                      fontSize: 11, fontWeight: isToday ? 700 : 500, lineHeight: 1.3,
                      transition: 'background 0.15s',
                    }}>
                      <div style={{ fontSize: 9 }}>{['日','月','火','水','木','金','土'][dow]}</div>
                      <div>{new Date(d).getMonth() + 1}/{new Date(d).getDate()}</div>
                    </div>
                  );
                })}
              </div>

              {/* Memo row */}
              <div style={{ display: 'flex', height: MEMO_ROW_HEIGHT, borderBottom: '1px solid #eee' }}>
                {dates.map((d) => (
                  <div key={d} style={{ width: COL_WIDTH, flexShrink: 0, borderRight: '1px solid #f5f5f5', padding: '1px 2px' }}>
                    <MemoCell dateStr={d} value={memos[d] || ''} onChange={onMemoChange} />
                  </div>
                ))}
              </div>

              {/* Lanes */}
              {MEAL_TIMES.map((mt, laneI) => (
                <div key={mt.key} style={{
                  height: LANE_HEIGHT, position: 'relative',
                  background: highlightLane === laneI && dragState ? (mt.color + '0A') : 'transparent',
                  borderBottom: `2px solid ${mt.color}22`,
                  transition: 'background 0.15s',
                }}>
                  {/* Column grid lines */}
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', pointerEvents: 'none' }}>
                    {dates.map((d, ci) => (
                      <div key={d} style={{
                        width: COL_WIDTH, flexShrink: 0, borderRight: '1px solid #f5f5f5',
                        background: highlightCol === ci && dragState ? (highlightColor + '0A') : 'transparent',
                      }} />
                    ))}
                  </div>

                  {/* Bars */}
                  {scheduled
                    .filter((s) => (s.mealTime || 'lunch') === mt.key)
                    .map((item) => {
                      const startIdx = dateIndex[item.startDate];
                      const endIdx = dateIndex[item.endDate];
                      if (startIdx == null) return null;
                      const left = startIdx * COL_WIDTH;
                      const span = (endIdx != null ? endIdx - startIdx : 0) + 1;
                      const width = span * COL_WIDTH - 4;
                      const gc = getGenreColor(item.recipeId);
                      const mtColor = mt.color;
                      return (
                        <div
                          key={item.id}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.effectAllowed = 'move';
                            handleBarDragStart(e, item, 'move');
                          }}
                          onTouchStart={(e) => handleBarDragStart(e, item, 'move')}
                          onClick={(e) => { e.stopPropagation(); onItemTap(item); }}
                          style={{
                            position: 'absolute', top: 3, left: left + 2,
                            width: Math.max(width, 30), height: LANE_HEIGHT - 6,
                            background: gc + '18', border: `1px solid ${gc}66`,
                            borderRadius: 6, display: 'flex', alignItems: 'center',
                            cursor: 'grab', overflow: 'hidden', zIndex: 2,
                            fontSize: 11, fontWeight: 600, color: gc,
                          }}
                        >
                          {/* Meal time color line */}
                          <div style={{ width: 4, height: '100%', background: mtColor, flexShrink: 0, borderRadius: '6px 0 0 6px' }} />
                          {item.noPrep && <span style={{ marginLeft: 2, fontSize: 10 }}>🛒</span>}
                          <span style={{
                            flex: 1, overflow: 'hidden', whiteSpace: 'nowrap',
                            textOverflow: 'ellipsis', padding: '0 3px', fontSize: 10,
                          }}>
                            {getRecipeName(item.recipeId)}
                          </span>
                          {/* Resize handle */}
                          <div
                            draggable
                            onDragStart={(e) => {
                              e.stopPropagation();
                              e.dataTransfer.effectAllowed = 'move';
                              handleBarDragStart(e, item, 'resize');
                            }}
                            onTouchStart={(e) => {
                              e.stopPropagation();
                              handleBarDragStart(e, item, 'resize');
                            }}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              width: 16, height: '100%', display: 'flex', alignItems: 'center',
                              justifyContent: 'center', cursor: 'col-resize', flexShrink: 0,
                              background: gc + '33', borderRadius: '0 6px 6px 0',
                              fontSize: 10, color: gc, fontWeight: 700, touchAction: 'none',
                            }}
                          >
                            ⋮
                          </div>
                        </div>
                      );
                    })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
