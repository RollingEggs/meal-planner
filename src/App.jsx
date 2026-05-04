import { useState, useEffect, useRef, useCallback } from 'react';
import {
  fetchRemoteData,
  saveRemoteData,
  parseData,
  cleanOldData,
} from './sheets';

const STORAGE_KEY = 'meal-planner-data';

export default function App() {
  const [data, setData] = useState({});
  const [syncStatus, setSyncStatus] = useState('loading');

  const dataRef = useRef(data);
  const syncCompletedRef = useRef(false);
  const syncInProgressRef = useRef(false);
  const lastSyncedDataRef = useRef(null);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  // ----------------------------
  // 初回ロード
  // ----------------------------
  useEffect(() => {
    const init = async () => {
      try {
        const localRaw = localStorage.getItem(STORAGE_KEY);
        const localData = localRaw ? JSON.parse(localRaw) : {};

        setData(localData);

        const remoteData = await fetchRemoteData();

        if (remoteData) {
          const cleaned = cleanOldData(parseData(remoteData));

          setData(cleaned);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
          lastSyncedDataRef.current = cleaned;

          setSyncStatus('synced');
        } else {
          setSyncStatus('offline');
        }
      } catch (err) {
        console.error('初期同期失敗:', err);
        setSyncStatus('offline');
      } finally {
        syncCompletedRef.current = true;
      }
    };

    init();
  }, []);

  // ----------------------------
  // 手動/定期同期
  // ----------------------------
  const syncRemoteNow = useCallback(async () => {
    if (!syncCompletedRef.current) return;
    if (syncInProgressRef.current) return;

    syncInProgressRef.current = true;
    setSyncStatus('syncing');

    try {
      const remoteData = await fetchRemoteData();

      if (!remoteData) {
        setSyncStatus('offline');
        return;
      }

      const cleaned = cleanOldData(parseData(remoteData));

      if (JSON.stringify(cleaned) !== JSON.stringify(dataRef.current)) {
        setData(cleaned);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
        lastSyncedDataRef.current = cleaned;
      }

      setSyncStatus('synced');
    } catch (err) {
      console.error('同期失敗:', err);
      setSyncStatus('offline');
    } finally {
      syncInProgressRef.current = false;
    }
  }, []);

  // ----------------------------
  // 5秒 polling
  // ----------------------------
  useEffect(() => {
    if (!syncCompletedRef.current) return;

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        syncRemoteNow();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [syncRemoteNow]);

  // ----------------------------
  // タブ復帰時同期
  // ----------------------------
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        syncRemoteNow();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [syncRemoteNow]);

  // ----------------------------
  // データ変更時保存
  // ----------------------------
  useEffect(() => {
    if (!syncCompletedRef.current) return;

    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

    const timer = setTimeout(async () => {
      syncInProgressRef.current = true;
      setSyncStatus('syncing');

      try {
        const result = await saveRemoteData(data);

        if (result === true) {
          setSyncStatus('synced');
          lastSyncedDataRef.current = data;
        } else {
          setSyncStatus('offline');
        }
      } catch (err) {
        console.error('保存失敗:', err);
        setSyncStatus('offline');
      } finally {
        syncInProgressRef.current = false;
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [data]);

  // ----------------------------
  // 献立更新関数例
  // ----------------------------
  const updateMeal = (date, meal) => {
    setData(prev => ({
      ...prev,
      [date]: meal,
    }));
  };

  // ----------------------------
  // UI
  // ----------------------------
  return (
    <div style={{ padding: 20 }}>
      <h1>献立アプリ</h1>

      <p>
        同期状態：
        {syncStatus === 'loading' && '読み込み中'}
        {syncStatus === 'syncing' && '同期中'}
        {syncStatus === 'synced' && '同期済み'}
        {syncStatus === 'offline' && 'オフライン'}
      </p>

      <button
        onClick={() =>
          updateMeal(
            new Date().toISOString().slice(0, 10),
            'カレー'
          )
        }
      >
        今日をカレーにする
      </button>

      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}
