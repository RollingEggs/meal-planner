import React, { useState, useMemo, useRef, useCallback } from 'react';
import { MEAL_TIMES, LANE_HEIGHT, HEADER_HEIGHT, MEMO_ROW_HEIGHT, LABEL_WIDTH } from '../constants';
import MemoCell from './MemoCell';

const TAP_THRESHOLD_PX = 10;
const TAP_THRESHOLD_MS = 300;
const LONG_PRESS_MS = 500;
const DOUBLE_TAP_MS = 400;

export default function GanttChart({
  dates, scheduled, recipes, genres, memos,
  onMemoChange, onItemTap, onDropRecipe, onMoveItem, onResizeItem,
  selectedRecipeId, selectedScheduleItemId, setSelectedScheduleItemId,
  colWidth,
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [resizeDrag, setResizeDrag] = useState(null);
  const touchRef = useRef(null);
  const longPressRef = useRef(null);
  const longPressFiredRef = useRef(false);
  const mouseDownRef = useRef(null);
  const lastBarTapRef = useRef({ id: null, time: 0 });

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

  const totalWidth = dates.length * colWidth;

  const getGenreColor = (recipeId) => {
    const r = recipes.find((rec) => rec.id === recipeId);
    const g = r ? genres.find((gen) => gen.id === r.genreId) : null;
    return g ? g.color : '#6C757D';
  };

  const getRecipeName = (recipeId) => {
    const r = recipes.find((rec) => rec.id === recipeId);
    return r ? r.name : '?';
  };

  const getDateAndLaneFromPosition = (clientX, clientY, scrollEl) => {
    if (!scrollEl) return { date: null, lane: null };
    const rect = scrollEl.getBoundingClientRect();
    const scrollLeft = scrollEl.scrollLeft;
    const x = clientX - rect.left + scrollLeft - LABEL_WIDTH;
    const y = clientY - rect.top - HEADER_HEIGHT - MEMO_ROW_HEIGHT;
    const colIdx = Math.floor(x / colWidth);
    const laneIdx = Math.min(2, Math.max(0, Math.floor(y / LANE_HEIGHT)));
    const date = dates[colIdx] || null;
    const lane = MEAL_TIMES[laneIdx]?.key || null;
    return { date, lane, colIdx, laneIdx };
  };

  // Check if a tap hit any bar in the lane area
  const getBarAtPosition = useCallback((date, lane) => {
    if (!date || !lane) return null;
    return scheduled.find((s) => {
      if ((s.mealTime || 'lunch') !== lane) return false;
      return date >= s.startDate && date <= s.endDate;
    });
  }, [scheduled]);

  // Cancel any pending long press timer
  const cancelLongPress = () => {
    if (longPressRef.current) {
      clearTimeout(longPressRef.current);
      longPressRef.current = null;
    }
  };

  // Handle tap on the gantt grid area (for placing/moving recipes)
  const handleGridTap = (clientX, clientY) => {
    const scrollEl = document.getElementById('gantt-scroll');
    const { date, lane } = getDateAndLaneFromPosition(clientX, clientY, scrollEl);
    if (!date || !lane) return;

    // Check if user tapped on an existing bar
    const hitBar = getBarAtPosition(date, lane);

    if (hitBar) {
      // Double tap on a bar → toggle selection
      const now = Date.now();
      const last = lastBarTapRef.current;
      if (last.id === hitBar.id && now - last.time < DOUBLE_TAP_MS) {
        if (selectedScheduleItemId === hitBar.id) {
          setSelectedScheduleItemId(null);
        } else {
          setSelectedScheduleItemId(hitBar.id);
        }
        lastBarTapRef.current = { id: null, time: 0 };
      } else {
        lastBarTapRef.current = { id: hitBar.id, time: now };
      }
      return;
    }

    // Tapped on empty area
    if (selectedRecipeId) {
      // Place new recipe from list
      onDropRecipe(selectedRecipeId, date, lane);
    } else if (selectedScheduleItemId) {
      // Move selected schedule item
      onMoveItem(selectedScheduleItemId, date, lane);
    }
  };

  // Start long press detection for a given position
  const startLongPress = (clientX, clientY) => {
    cancelLongPress();
    longPressFiredRef.current = false;
    const scrollEl = document.getElementById('gantt-scroll');
    const { date, lane } = getDateAndLaneFromPosition(clientX, clientY, scrollEl);
    const hitBar = getBarAtPosition(date, lane);
    if (hitBar) {
      longPressRef.current = setTimeout(() => {
        longPressFiredRef.current = true;
        onItemTap(hitBar);
      }, LONG_PRESS_MS);
    }
  };

  // Mouse handling: mousedown/mouseup for tap + long press
  const handleMouseDown = (e) => {
    if (resizeDrag) return;
    mouseDownRef.current = { startX: e.clientX, startY: e.clientY };
    startLongPress(e.clientX, e.clientY);
  };

  const handleMouseMove = (e) => {
    if (!mouseDownRef.current) return;
    const dx = Math.abs(e.clientX - mouseDownRef.current.startX);
    const dy = Math.abs(e.clientY - mouseDownRef.current.startY);
    if (dx > TAP_THRESHOLD_PX || dy > TAP_THRESHOLD_PX) {
      cancelLongPress();
    }
  };

  const handleMouseUp = (e) => {
    cancelLongPress();
    if (!mouseDownRef.current) return;
    if (longPressFiredRef.current) {
      mouseDownRef.current = null;
      return;
    }
    handleGridTap(e.clientX, e.clientY);
    mouseDownRef.current = null;
  };

  // Touch handling: distinguish tap / long press / scroll
  const handleTouchStart = (e) => {
    if (resizeDrag) return;
    const touch = e.touches[0];
    touchRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      startTime: Date.now(),
      moved: false,
    };
    startLongPress(touch.clientX, touch.clientY);
  };

  const handleTouchMove = (e) => {
    if (!touchRef.current) return;
    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - touchRef.current.startX);
    const dy = Math.abs(touch.clientY - touchRef.current.startY);
    if (dx > TAP_THRESHOLD_PX || dy > TAP_THRESHOLD_PX) {
      touchRef.current.moved = true;
      cancelLongPress();
    }
  };

  const handleTouchEnd = (e) => {
    cancelLongPress();
    if (!touchRef.current) return;
    const elapsed = Date.now() - touchRef.current.startTime;
    const wasTap = !touchRef.current.moved && elapsed < TAP_THRESHOLD_MS && !longPressFiredRef.current;
    if (wasTap) {
      const touch = e.changedTouches[0];
      handleGridTap(touch.clientX, touch.clientY);
    }
    touchRef.current = null;
  };

  // Resize handle: touch drag with ghost preview
  const handleResizeTouchStart = (e, item) => {
    e.stopPropagation();
    const touch = e.touches[0];
    setResizeDrag({ itemId: item.id, startX: touch.clientX, origEnd: item.endDate, hoverDate: item.endDate });
  };

  const handleResizeTouchMove = (e) => {
    if (!resizeDrag) return;
    e.preventDefault();
    const touch = e.touches[0];
    const scrollEl = document.getElementById('gantt-scroll');
    const { date } = getDateAndLaneFromPosition(touch.clientX, touch.clientY, scrollEl);
    if (date) {
      setResizeDrag((prev) => ({ ...prev, hoverDate: date }));
    }
  };

  const handleResizeTouchEnd = (e) => {
    if (!resizeDrag) return;
    const touch = e.changedTouches[0];
    const scrollEl = document.getElementById('gantt-scroll');
    const { date } = getDateAndLaneFromPosition(touch.clientX, touch.clientY, scrollEl);
    if (date) {
      onResizeItem(resizeDrag.itemId, date);
    }
    setResizeDrag(null);
  };

  // Resize handle: mouse drag with ghost preview
  const handleResizeMouseDown = (e, item) => {
    e.stopPropagation();
    setResizeDrag({ itemId: item.id, startX: e.clientX, origEnd: item.endDate, hoverDate: item.endDate, mouse: true });
  };

  const handleResizeMouseMove = (e) => {
    if (!resizeDrag || !resizeDrag.mouse) return;
    const scrollEl = document.getElementById('gantt-scroll');
    const { date } = getDateAndLaneFromPosition(e.clientX, e.clientY, scrollEl);
    if (date) {
      setResizeDrag((prev) => ({ ...prev, hoverDate: date }));
    }
  };

  const handleResizeMouseUp = (e) => {
    if (!resizeDrag || !resizeDrag.mouse) return;
    const scrollEl = document.getElementById('gantt-scroll');
    const { date } = getDateAndLaneFromPosition(e.clientX, e.clientY, scrollEl);
    if (date) {
      onResizeItem(resizeDrag.itemId, date);
    }
    setResizeDrag(null);
  };

  // Compute ghost bar dimensions for resize preview
  const resizeGhost = useMemo(() => {
    if (!resizeDrag || !resizeDrag.hoverDate) return null;
    const item = scheduled.find((s) => s.id === resizeDrag.itemId);
    if (!item) return null;
    const startIdx = dateIndex[item.startDate];
    const endIdx = dateIndex[resizeDrag.hoverDate];
    if (startIdx == null || endIdx == null || endIdx < startIdx) return null;
    const left = startIdx * colWidth;
    const span = endIdx - startIdx + 1;
    const width = span * colWidth - 4;
    const laneIdx = MEAL_TIMES.findIndex((m) => m.key === (item.mealTime || 'lunch'));
    if (laneIdx < 0) return null;
    return { left, width, laneIdx, recipeId: item.recipeId, itemId: item.id };
  }, [resizeDrag, scheduled, dateIndex, colWidth]);

  const scheduleCount = scheduled.length;

  // Determine highlight color based on selection
  const highlightColor = selectedRecipeId ? getGenreColor(selectedRecipeId)
    : selectedScheduleItemId ? getGenreColor(scheduled.find(s => s.id === selectedScheduleItemId)?.recipeId) : null;
  const hasSelection = !!(selectedRecipeId || selectedScheduleItemId);

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
        {hasSelection && (
          <span style={{
            background: highlightColor || '#E53E3E', color: '#fff', fontSize: 10, padding: '1px 8px',
            borderRadius: 10, fontWeight: 700, marginLeft: 'auto',
          }}>タップで配置</span>
        )}
      </div>
      {!collapsed && (
        <div
          id="gantt-scroll"
          onMouseDown={handleMouseDown}
          onMouseMove={(e) => { handleMouseMove(e); handleResizeMouseMove(e); }}
          onMouseUp={(e) => { handleResizeMouseUp(e); handleMouseUp(e); }}
          onTouchStart={handleTouchStart}
          onTouchMove={(e) => { handleTouchMove(e); handleResizeTouchMove(e); }}
          onTouchEnd={(e) => { handleResizeTouchEnd(e); handleTouchEnd(e); }}
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
                {dates.map((d) => {
                  const dow = new Date(d).getDay();
                  const isToday = d === todayStr;
                  return (
                    <div key={d} style={{
                      width: colWidth, flexShrink: 0, textAlign: 'center',
                      borderRight: '1px solid #f0f0f0',
                      background: isToday ? '#3D3D3D' : '#FAFAF8',
                      color: isToday ? '#fff' : dow === 0 ? '#DC2626' : dow === 6 ? '#2563EB' : '#666',
                      display: 'flex', flexDirection: 'column', justifyContent: 'center',
                      fontSize: 11, fontWeight: isToday ? 700 : 500, lineHeight: 1.3,
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
                  <div key={d} style={{ width: colWidth, flexShrink: 0, borderRight: '1px solid #f5f5f5', padding: '1px 2px' }}>
                    <MemoCell dateStr={d} value={memos[d] || ''} onChange={onMemoChange} />
                  </div>
                ))}
              </div>

              {/* Lanes */}
              {MEAL_TIMES.map((mt, laneI) => (
                <div key={mt.key} style={{
                  height: LANE_HEIGHT, position: 'relative',
                  borderBottom: `2px solid ${mt.color}22`,
                }}>
                  {/* Column grid lines */}
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', pointerEvents: 'none' }}>
                    {dates.map((d) => (
                      <div key={d} style={{
                        width: colWidth, flexShrink: 0, borderRight: '1px solid #f5f5f5',
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
                      const left = startIdx * colWidth;
                      const span = (endIdx != null ? endIdx - startIdx : 0) + 1;
                      const width = span * colWidth - 4;
                      const gc = getGenreColor(item.recipeId);
                      const mtColor = mt.color;
                      const isSelected = selectedScheduleItemId === item.id;
                      const isResizing = resizeDrag && resizeDrag.itemId === item.id;
                      return (
                        <div
                          key={item.id}
                          style={{
                            position: 'absolute', top: 3, left: left + 2,
                            width: Math.max(width, 30), height: LANE_HEIGHT - 6,
                            background: isResizing ? gc + '0a' : isSelected ? gc + '38' : gc + '18',
                            border: isResizing ? `1px dashed ${gc}44` : isSelected ? `2px solid ${gc}` : `1px solid ${gc}66`,
                            borderRadius: 6, display: 'flex', alignItems: 'center',
                            cursor: 'pointer', overflow: 'hidden', zIndex: 2,
                            fontSize: 11, fontWeight: 600, color: isResizing ? gc + '66' : gc,
                            boxShadow: isSelected && !isResizing ? `0 0 6px ${gc}44` : 'none',
                            opacity: isResizing ? 0.4 : 1,
                            transition: isResizing ? 'none' : 'all 0.15s',
                          }}
                        >
                          {/* Meal time color line */}
                          <div style={{ width: 4, height: '100%', background: mtColor, flexShrink: 0, borderRadius: '6px 0 0 6px' }} />
                          <span style={{
                            flex: 1, overflow: 'hidden', whiteSpace: 'nowrap',
                            textOverflow: 'ellipsis', padding: '0 3px', fontSize: 10,
                          }}>
                            {getRecipeName(item.recipeId)}
                          </span>
                          {/* Resize handle */}
                          <div
                            onTouchStart={(e) => handleResizeTouchStart(e, item)}
                            onMouseDown={(e) => handleResizeMouseDown(e, item)}
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

                  {/* Resize ghost bar */}
                  {resizeGhost && resizeGhost.laneIdx === laneI && (
                    <div
                      style={{
                        position: 'absolute', top: 3, left: resizeGhost.left + 2,
                        width: Math.max(resizeGhost.width, 30), height: LANE_HEIGHT - 6,
                        background: getGenreColor(resizeGhost.recipeId) + '25',
                        border: `2px dashed ${getGenreColor(resizeGhost.recipeId)}`,
                        borderRadius: 6, zIndex: 5, pointerEvents: 'none',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 9, color: getGenreColor(resizeGhost.recipeId), fontWeight: 700,
                      }}
                    >
                      {getRecipeName(resizeGhost.recipeId)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
