import React, { useEffect, useState, useMemo, useCallback, useRef, useSyncExternalStore } from 'react';
import {
  DEFAULT_GENRES, STORAGE_KEY, getDateRange, today, addDays, genId, COL_WIDTH, LABEL_WIDTH,
  fs, FONT_SCALE_KEY, FONT_SCALE_MIN, FONT_SCALE_MAX, FONT_SCALE_STEP,
} from './constants';
import { useUndoRedo } from './hooks/useUndoRedo';
import { fetchRemoteData, saveRemoteData, isSyncConfigured } from './sheets';
import GanttChart from './components/GanttChart';
import PrepSchedule from './components/PrepSchedule';
import RecipeList from './components/RecipeList';
import DetailModal from './components/DetailModal';
import SettingsModal from './components/SettingsModal';
import RecipeManager from './components/RecipeManager';

// ヘッダーを 1 行に収められる画面幅か（PC 判定）
const WIDE_QUERY = '(min-width: 720px)';
const subscribeWide = (onChange) => {
  const mq = window.matchMedia(WIDE_QUERY);
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
};
const getWideSnapshot = () => window.matchMedia(WIDE_QUERY).matches;

const INITIAL_DATA = {
  recipes: [],
  scheduled: [],
  genres: [...DEFAULT_GENRES],
  memos: {},
};

function parseData(parsed) {
  return {
    recipes: parsed.recipes || [],
    scheduled: parsed.scheduled || [],
    genres: parsed.genres && parsed.genres.length > 0 ? parsed.genres : [...DEFAULT_GENRES],
    memos: parsed.memos || {},
  };
}

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return parseData(JSON.parse(raw));
  } catch { /* ignore */ }
  return { ...INITIAL_DATA, genres: [...DEFAULT_GENRES] };
}

function cleanOldData(data) {
  const cutoff = addDays(today(), -14);
  return {
    ...data,
    scheduled: data.scheduled.filter((s) => s.endDate >= cutoff || s.startDate >= cutoff),
    memos: Object.fromEntries(
      Object.entries(data.memos).filter(([d]) => d >= cutoff)
    ),
  };
}

export default function App() {
  const { state: data, pushState, undo, redo, canUndo, canRedo, undoCount, redoCount, resetHistory } = useUndoRedo(cleanOldData(loadData()));

  const [tab, setTab] = useState('plan');
  const [selectedRecipeId, setSelectedRecipeId] = useState(null);
  const [selectedScheduleItemId, setSelectedScheduleItemId] = useState(null);
  const [detailItem, setDetailItem] = useState(null);
  const [showSettings, setShowSettings] = useState(() => !isSyncConfigured());
  const scrolledRef = useRef(false);
  const scrollSyncRef = useRef(false);
  const [colWidth, setColWidth] = useState(() => {
    const saved = localStorage.getItem('colWidth');
    return saved ? parseInt(saved, 10) : COL_WIDTH;
  });
  const [fontScale, setFontScale] = useState(() => {
    const saved = parseFloat(localStorage.getItem(FONT_SCALE_KEY));
    if (!Number.isFinite(saved)) return 1;
    return Math.min(FONT_SCALE_MAX, Math.max(FONT_SCALE_MIN, saved));
  });
  const [syncStatus, setSyncStatus] = useState(() => isSyncConfigured() ? 'syncing' : 'idle'); // idle | syncing | synced | offline
  const initialSyncDoneRef = useRef(false);
  const syncCompletedRef = useRef(false);
  const lastSyncedDataRef = useRef(null);
  const dataRef = useRef(data);

  // Zoom while keeping currently centered date in view
  const handleZoom = useCallback((delta) => {
    const el = document.getElementById('gantt-scroll');
    if (!el) {
      setColWidth(w => {
        const newW = Math.max(60, Math.min(256, w + delta));
        localStorage.setItem('colWidth', newW);
        return newW;
      });
      return;
    }
    const viewCenter = el.scrollLeft + (el.clientWidth - LABEL_WIDTH) / 2;
    const centerDateIdx = viewCenter / colWidth;
    setColWidth(w => {
      const newW = Math.max(60, Math.min(256, w + delta));
      localStorage.setItem('colWidth', newW);
      requestAnimationFrame(() => {
        el.scrollLeft = centerDateIdx * newW - (el.clientWidth - LABEL_WIDTH) / 2;
      });
      return newW;
    });
  }, [colWidth]);

  // 画面幅でヘッダーの並べ方を切り替える（PC は 1 行に収める）
  const isWide = useSyncExternalStore(subscribeWide, getWideSnapshot, () => true);

  // Apply the font scale as a CSS variable so every fs() size follows it
  useEffect(() => {
    document.documentElement.style.setProperty('--fs', String(fontScale));
    localStorage.setItem(FONT_SCALE_KEY, String(fontScale));
  }, [fontScale]);

  const handleFontScale = useCallback((delta) => {
    setFontScale((s) => {
      const next = Math.round((s + delta) * 10) / 10;
      return Math.min(FONT_SCALE_MAX, Math.max(FONT_SCALE_MIN, next));
    });
  }, []);

  const dates = useMemo(() => getDateRange(today(), 14, 14), []);

  // Keep dataRef in sync
  useEffect(() => { dataRef.current = data; }, [data]);

  // Fetch from remote on mount
  useEffect(() => {
    if (initialSyncDoneRef.current) return;
    initialSyncDoneRef.current = true;
    fetchRemoteData().then(async (remoteData) => {
      if (remoteData && (remoteData.recipes?.length || remoteData.scheduled?.length)) {
        const cleaned = cleanOldData(parseData(remoteData));
        resetHistory(cleaned);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
        lastSyncedDataRef.current = cleaned;
        setSyncStatus('synced');
      } else {
        // Remote has no data — push local data up
        const local = cleanOldData(loadData());
        const ok = await saveRemoteData(local);
        lastSyncedDataRef.current = local;
        setSyncStatus(ok === false ? 'offline' : 'synced');
      }
      syncCompletedRef.current = true;
    });
  }, [resetHistory]);

  // Save to localStorage + remote
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    if (!syncCompletedRef.current) return;
    // Debounce remote writes to prevent race conditions when edits happen rapidly
    const timer = setTimeout(async () => {
      setSyncStatus('syncing');
      const result = await saveRemoteData(data);
      if (result === true) setSyncStatus('synced');
      else if (result === false) setSyncStatus('offline');
      lastSyncedDataRef.current = data;
    }, 500);
    return () => clearTimeout(timer);
  }, [data]);

  // Reset scroll flag when switching back to plan tab
  useEffect(() => {
    if (tab === 'plan') {
      scrolledRef.current = false;
    }
  }, [tab]);

  // Auto-scroll gantt to today on mount and tab switch
  useEffect(() => {
    if (scrolledRef.current) return;
    const timer = setTimeout(() => {
      const el = document.getElementById('gantt-scroll');
      if (el) {
        const todayIdx = dates.indexOf(today());
        if (todayIdx >= 0) {
          const scrollTo = todayIdx * colWidth + colWidth / 2 - (el.clientWidth - LABEL_WIDTH) / 2;
          el.scrollLeft = Math.max(0, scrollTo);
        }
        scrolledRef.current = true;
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [dates, tab, colWidth]);

  // Sync prep scroll with gantt scroll (bidirectional)
  useEffect(() => {
    const gantt = document.getElementById('gantt-scroll');
    const prep = document.getElementById('prep-scroll');
    if (!gantt || !prep) return;
    // Sync initial position when prep opens
    prep.scrollLeft = gantt.scrollLeft;
    const ganttHandler = () => {
      if (scrollSyncRef.current) return;
      scrollSyncRef.current = true;
      prep.scrollLeft = gantt.scrollLeft;
      requestAnimationFrame(() => { scrollSyncRef.current = false; });
    };
    const prepHandler = () => {
      if (scrollSyncRef.current) return;
      scrollSyncRef.current = true;
      gantt.scrollLeft = prep.scrollLeft;
      requestAnimationFrame(() => { scrollSyncRef.current = false; });
    };
    gantt.addEventListener('scroll', ganttHandler);
    prep.addEventListener('scroll', prepHandler);
    return () => {
      gantt.removeEventListener('scroll', ganttHandler);
      prep.removeEventListener('scroll', prepHandler);
    };
  });

  // Fetch latest from remote (manual refresh + tab visibility)
  const syncRemoteNow = useCallback(async () => {
    if (!syncCompletedRef.current) return;
    setSyncStatus('syncing');
    const remoteData = await fetchRemoteData();
    if (!remoteData) {
      setSyncStatus('offline');
      return;
    }
    const cleaned = cleanOldData(parseData(remoteData));
    if (JSON.stringify(cleaned) !== JSON.stringify(lastSyncedDataRef.current)) {
      resetHistory(cleaned);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
      lastSyncedDataRef.current = cleaned;
    }
    setSyncStatus('synced');
  }, [resetHistory]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') syncRemoteNow();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [syncRemoteNow]);

  // Memo change
  const handleMemoChange = useCallback((dateStr, text) => {
    const newMemos = { ...data.memos };
    if (text.trim()) {
      newMemos[dateStr] = text.trim();
    } else {
      delete newMemos[dateStr];
    }
    pushState({ ...data, memos: newMemos });
  }, [data, pushState]);

  // Drop recipe to schedule
  const handleDropRecipe = useCallback((recipeId, date, mealTime) => {
    const recipe = data.recipes.find((r) => r.id === recipeId);
    const genre = recipe ? data.genres.find((g) => g.id === recipe.genreId) : null;
    const isEatingOut = genre && genre.name === '外食';
    const newItem = {
      id: genId(),
      recipeId,
      startDate: date,
      endDate: date,
      prepDate: isEatingOut ? null : addDays(date, -1),
      noPrep: isEatingOut ? true : false,
      mealTime: mealTime || 'lunch',
    };
    pushState({ ...data, scheduled: [...data.scheduled, newItem] });
    setSelectedRecipeId(null);
  }, [data, pushState]);

  // Move item to new date/lane
  const handleMoveItem = useCallback((itemId, newDate, newLane) => {
    pushState({
      ...data,
      scheduled: data.scheduled.map((s) => {
        if (s.id !== itemId) return s;
        const daySpan = Math.round((new Date(s.endDate + 'T12:00:00') - new Date(s.startDate + 'T12:00:00')) / 86400000);
        const newEnd = addDays(newDate, daySpan);
        const newPrep = s.noPrep ? null : (s.prepDate === s.startDate ? newDate : addDays(newDate, -1));
        return { ...s, startDate: newDate, endDate: newEnd, prepDate: newPrep, mealTime: newLane || s.mealTime };
      }),
    });
    setSelectedScheduleItemId(null);
  }, [data, pushState]);

  // Resize item
  const handleResizeItem = useCallback((itemId, newEndDate) => {
    pushState({
      ...data,
      scheduled: data.scheduled.map((s) => {
        if (s.id !== itemId) return s;
        if (newEndDate < s.startDate) return s;
        return { ...s, endDate: newEndDate };
      }),
    });
  }, [data, pushState]);

  // Update scheduled item from detail modal
  const handleUpdateItem = useCallback((updated) => {
    pushState({
      ...data,
      scheduled: data.scheduled.map((s) => s.id === updated.id ? updated : s),
    });
    setDetailItem(updated);
  }, [data, pushState]);

  // Delete scheduled item
  const handleDeleteItem = useCallback((itemId) => {
    pushState({
      ...data,
      scheduled: data.scheduled.filter((s) => s.id !== itemId),
    });
  }, [data, pushState]);

  // Data update (for recipe manager)
  const handleDataUpdate = useCallback((newData) => {
    pushState(newData);
  }, [pushState]);

  // Import
  const handleImport = useCallback((importedData) => {
    const cleaned = cleanOldData({
      recipes: importedData.recipes || [],
      scheduled: importedData.scheduled || [],
      genres: importedData.genres && importedData.genres.length > 0 ? importedData.genres : [...DEFAULT_GENRES],
      memos: importedData.memos || {},
    });
    resetHistory(cleaned);
  }, [resetHistory]);

  const headerStyle = {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    gap: 8, flexWrap: 'wrap',
    padding: '10px 14px', background: '#fff', borderBottom: '1px solid #eee',
    position: 'sticky', top: 0, zIndex: 100,
  };

  const tabBtnStyle = (active) => ({
    padding: '6px 16px', borderRadius: 20, border: 'none',
    background: active ? '#3D3D3D' : '#f0f0f0',
    color: active ? '#fff' : '#888',
    fontSize: fs(13), fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
  });

  const iconBtnStyle = (enabled) => ({
    width: fs(34), height: fs(34), borderRadius: 8, border: 'none',
    background: enabled ? '#f0f0f0' : '#f8f8f8',
    color: enabled ? '#3D3D3D' : '#ccc',
    fontSize: fs(16), cursor: enabled ? 'pointer' : 'default',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    position: 'relative', fontFamily: 'inherit', flexShrink: 0,
  });

  const badgeStyle = {
    position: 'absolute', top: -4, right: -4, background: '#E53E3E', color: '#fff',
    fontSize: fs(8), fontWeight: 700, width: 14, height: 14, borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  };

  // ヘッダーの小さな操作グループ（文字サイズ / 列幅）
  const ctrlGroupStyle = {
    display: 'flex', gap: 3, alignItems: 'center',
    background: '#fafafa', border: '1px solid #eee', borderRadius: 10, padding: '3px 6px',
  };

  const ctrlLabelStyle = { fontSize: fs(9), color: '#aaa', fontWeight: 700, whiteSpace: 'nowrap' };

  const ctrlBtnStyle = (enabled = true, size = 16) => ({
    minWidth: fs(28), height: fs(28), padding: '0 5px', borderRadius: 8, border: 'none',
    background: enabled ? '#f0f0f0' : '#f8f8f8',
    color: enabled ? '#3D3D3D' : '#ccc',
    fontSize: fs(size), cursor: enabled ? 'pointer' : 'default',
    fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'inherit', flexShrink: 0, lineHeight: 1, whiteSpace: 'nowrap',
  });

  const tabButtons = (
    <div style={{ display: 'flex', gap: 6 }}>
      <button style={tabBtnStyle(tab === 'plan')} onClick={() => setTab('plan')}>献立</button>
      <button style={tabBtnStyle(tab === 'recipe')} onClick={() => setTab('recipe')}>レシピ管理</button>
    </div>
  );

  const sizeControls = (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
      {/* 文字サイズ */}
      <div style={ctrlGroupStyle}>
        <span style={ctrlLabelStyle}>文字</span>
        <button
          onClick={() => handleFontScale(-FONT_SCALE_STEP)}
          disabled={fontScale <= FONT_SCALE_MIN}
          style={ctrlBtnStyle(fontScale > FONT_SCALE_MIN, 12)}
          title="文字を小さく"
        >A−</button>
        <span
          onClick={() => setFontScale(1)}
          title="文字サイズを標準に戻す"
          style={{
            fontSize: fs(10), fontWeight: 700, color: '#888', cursor: 'pointer',
            minWidth: fs(30), textAlign: 'center', whiteSpace: 'nowrap',
          }}
        >{Math.round(fontScale * 100)}%</span>
        <button
          onClick={() => handleFontScale(FONT_SCALE_STEP)}
          disabled={fontScale >= FONT_SCALE_MAX}
          style={ctrlBtnStyle(fontScale < FONT_SCALE_MAX, 17)}
          title="文字を大きく"
        >A＋</button>
      </div>

      {/* 列幅 */}
      {tab === 'plan' && (
        <div style={ctrlGroupStyle}>
          <span style={ctrlLabelStyle}>列幅</span>
          <button onClick={() => handleZoom(-16)} style={ctrlBtnStyle()} title="列幅を狭く">−</button>
          <button onClick={() => handleZoom(16)} style={ctrlBtnStyle()} title="列幅を広く">＋</button>
        </div>
      )}
    </div>
  );

  const historyControls = (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
      <button style={iconBtnStyle(canUndo)} onClick={undo} disabled={!canUndo} title="元に戻す">
        ↩
        {undoCount > 0 && <span style={badgeStyle}>{undoCount}</span>}
      </button>
      <button style={iconBtnStyle(canRedo)} onClick={redo} disabled={!canRedo} title="やり直す">
        ↪
        {redoCount > 0 && <span style={badgeStyle}>{redoCount}</span>}
      </button>
      {syncStatus !== 'idle' && (
        <span
          onClick={syncStatus === 'offline' ? syncRemoteNow : undefined}
          style={{
            fontSize: fs(10), fontWeight: 700, padding: '2px 6px', borderRadius: 6,
            background: syncStatus === 'offline' ? '#FEE2E2' : syncStatus === 'syncing' ? '#FEF9C3' : '#DCFCE7',
            color: syncStatus === 'offline' ? '#DC2626' : syncStatus === 'syncing' ? '#CA8A04' : '#16A34A',
            cursor: syncStatus === 'offline' ? 'pointer' : 'default',
          }}
          title={syncStatus === 'syncing' ? '同期中...' : syncStatus === 'offline' ? '同期失敗（タップで再試行）' : '同期済み'}
        >
          {syncStatus === 'syncing' ? '⟳' : syncStatus === 'offline' ? '✕ 再試行' : '✓'}
        </span>
      )}
      <button style={iconBtnStyle(true)} onClick={() => setShowSettings(true)} title="設定">⚙</button>
    </div>
  );

  return (
    <div style={{ width: '100%', minHeight: '100vh', background: '#FAFAF8' }}>
      {/* Header: PC は 1 行、狭い画面は「タブ＋操作」/「サイズ調整」の 2 行 */}
      <div style={headerStyle}>
        {isWide ? (
          <>
            {tabButtons}
            {sizeControls}
            {historyControls}
          </>
        ) : (
          <>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              gap: 8, flex: '1 1 100%',
            }}>
              {tabButtons}
              {historyControls}
            </div>
            {sizeControls}
          </>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: '8px clamp(10px, 1.2vw, 24px)' }}>
        {tab === 'plan' ? (
          <>
            <GanttChart
              dates={dates}
              scheduled={data.scheduled}
              recipes={data.recipes}
              genres={data.genres}
              memos={data.memos}
              onMemoChange={handleMemoChange}
              onItemTap={setDetailItem}
              onDropRecipe={handleDropRecipe}
              onMoveItem={handleMoveItem}
              onResizeItem={handleResizeItem}
              selectedRecipeId={selectedRecipeId}
              selectedScheduleItemId={selectedScheduleItemId}
              setSelectedScheduleItemId={setSelectedScheduleItemId}
              colWidth={colWidth}
              fontScale={fontScale}
            />
            <PrepSchedule
              dates={dates}
              scheduled={data.scheduled}
              recipes={data.recipes}
              genres={data.genres}
              colWidth={colWidth}
              fontScale={fontScale}
            />
            <RecipeList
              recipes={data.recipes}
              genres={data.genres}
              selectedRecipeId={selectedRecipeId}
              onSelectRecipe={(id) => {
                setSelectedRecipeId(id);
                if (id) setSelectedScheduleItemId(null);
              }}
            />
          </>
        ) : (
          <RecipeManager data={data} onUpdate={handleDataUpdate} />
        )}
      </div>

      {/* Detail modal */}
      {detailItem && (
        <DetailModal
          item={detailItem}
          recipes={data.recipes}
          genres={data.genres}
          onUpdate={handleUpdateItem}
          onDelete={handleDeleteItem}
          onClose={() => setDetailItem(null)}
        />
      )}

      {/* Settings modal */}
      {showSettings && (
        <SettingsModal
          data={data}
          onImport={handleImport}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
