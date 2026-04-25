import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { DEFAULT_GENRES, STORAGE_KEY, getDateRange, today, formatDate, addDays, genId, COL_WIDTH, LABEL_WIDTH } from './constants';
import { useUndoRedo } from './hooks/useUndoRedo';
import { fetchRemoteData, saveRemoteData, getSyncUrl } from './sheets';
import GanttChart from './components/GanttChart';
import PrepSchedule from './components/PrepSchedule';
import RecipeList from './components/RecipeList';
import DetailModal from './components/DetailModal';
import SettingsModal from './components/SettingsModal';
import RecipeManager from './components/RecipeManager';

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
  const [showSettings, setShowSettings] = useState(() => !getSyncUrl());
  const scrolledRef = useRef(false);
  const scrollSyncRef = useRef(false);
  const [colWidth, setColWidth] = useState(COL_WIDTH);
  const [syncStatus, setSyncStatus] = useState('idle'); // idle | syncing | synced | offline
  const initialSyncDoneRef = useRef(false);
  const syncCompletedRef = useRef(false);
  const lastSyncedDataRef = useRef(null);
  const dataRef = useRef(data);

  // Zoom while keeping currently centered date in view
  const handleZoom = useCallback((delta) => {
    const el = document.getElementById('gantt-scroll');
    if (!el) {
      setColWidth(w => Math.max(60, Math.min(256, w + delta)));
      return;
    }
    const viewCenter = el.scrollLeft + (el.clientWidth - LABEL_WIDTH) / 2;
    const centerDateIdx = viewCenter / colWidth;
    setColWidth(w => {
      const newW = Math.max(60, Math.min(256, w + delta));
      requestAnimationFrame(() => {
        el.scrollLeft = centerDateIdx * newW - (el.clientWidth - LABEL_WIDTH) / 2;
      });
      return newW;
    });
  }, [colWidth]);

  const dates = useMemo(() => getDateRange(today(), 14, 14), []);

  // Keep dataRef in sync
  useEffect(() => { dataRef.current = data; }, [data]);

  // Fetch from JSONBin on mount
  useEffect(() => {
    if (initialSyncDoneRef.current) return;
    initialSyncDoneRef.current = true;
    setSyncStatus('syncing');
    fetchRemoteData().then((remoteData) => {
      if (remoteData && (remoteData.recipes?.length || remoteData.scheduled?.length)) {
        const cleaned = cleanOldData(parseData(remoteData));
        resetHistory(cleaned);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
        lastSyncedDataRef.current = cleaned;
        setSyncStatus('synced');
      } else {
        // Remote has no data — push local data up
        const local = cleanOldData(loadData());
        saveRemoteData(local);
        lastSyncedDataRef.current = local;
        setSyncStatus('synced');
      }
      syncCompletedRef.current = true;
    });
  }, [resetHistory]);

  // Save to localStorage + JSONBin
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    if (syncCompletedRef.current) {
      saveRemoteData(data);
      lastSyncedDataRef.current = data;
    }
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
        const daySpan = Math.round((new Date(s.endDate) - new Date(s.startDate)) / 86400000);
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
    padding: '10px 14px', background: '#fff', borderBottom: '1px solid #eee',
    position: 'sticky', top: 0, zIndex: 100,
  };

  const tabBtnStyle = (active) => ({
    padding: '6px 16px', borderRadius: 20, border: 'none',
    background: active ? '#3D3D3D' : '#f0f0f0',
    color: active ? '#fff' : '#888',
    fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
  });

  const iconBtnStyle = (enabled) => ({
    width: 34, height: 34, borderRadius: 8, border: 'none',
    background: enabled ? '#f0f0f0' : '#f8f8f8',
    color: enabled ? '#3D3D3D' : '#ccc',
    fontSize: 16, cursor: enabled ? 'pointer' : 'default',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    position: 'relative', fontFamily: 'inherit',
  });

  const badgeStyle = {
    position: 'absolute', top: -4, right: -4, background: '#E53E3E', color: '#fff',
    fontSize: 8, fontWeight: 700, width: 14, height: 14, borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', minHeight: '100vh', background: '#FAFAF8' }}>
      {/* Header */}
      <div style={headerStyle}>
        <div style={{ display: 'flex', gap: 6 }}>
          <button style={tabBtnStyle(tab === 'plan')} onClick={() => setTab('plan')}>献立</button>
          <button style={tabBtnStyle(tab === 'recipe')} onClick={() => setTab('recipe')}>レシピ管理</button>
        </div>
        {tab === 'plan' && (
          <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <button
              onClick={() => handleZoom(-16)}
              style={{
                width: 30, height: 30, borderRadius: 8, border: 'none',
                background: '#f0f0f0', color: '#3D3D3D', fontSize: 16, cursor: 'pointer',
                fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'inherit',
              }}
            >−</button>
            <button
              onClick={() => handleZoom(16)}
              style={{
                width: 30, height: 30, borderRadius: 8, border: 'none',
                background: '#f0f0f0', color: '#3D3D3D', fontSize: 16, cursor: 'pointer',
                fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'inherit',
              }}
            >＋</button>
          </div>
        )}
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <button style={iconBtnStyle(canUndo)} onClick={undo} disabled={!canUndo} title="元に戻す">
            ↩
            {undoCount > 0 && <span style={badgeStyle}>{undoCount}</span>}
          </button>
          <button style={iconBtnStyle(canRedo)} onClick={redo} disabled={!canRedo} title="やり直す">
            ↪
            {redoCount > 0 && <span style={badgeStyle}>{redoCount}</span>}
          </button>
          <button style={iconBtnStyle(true)} onClick={() => setShowSettings(true)} title="設定">⚙</button>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '8px 10px' }}>
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
            />
            <PrepSchedule
              dates={dates}
              scheduled={data.scheduled}
              recipes={data.recipes}
              genres={data.genres}
              colWidth={colWidth}
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
