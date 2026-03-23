export const DEFAULT_GENRES = [
  { id: 'g1', name: '和食', color: '#C84B31' },
  { id: 'g2', name: '洋食', color: '#2D6A4F' },
  { id: 'g3', name: '中華', color: '#E76F51' },
  { id: 'g4', name: '韓国', color: '#D62828' },
  { id: 'g5', name: 'イタリアン', color: '#6A5ACD' },
  { id: 'g6', name: 'サラダ', color: '#52B788' },
  { id: 'g7', name: '汁物', color: '#4A90D9' },
  { id: 'g8', name: '副菜', color: '#B5838D' },
  { id: 'g9', name: '外食', color: '#D4A017' },
  { id: 'g10', name: 'その他', color: '#6C757D' },
];

export const MEAL_TIMES = [
  { key: 'morning', icon: '🌅', label: '朝', color: '#3B82F6' },
  { key: 'lunch', icon: '☀️', label: '昼', color: '#22C55E' },
  { key: 'dinner', icon: '🌙', label: '夜', color: '#9B1B30' },
];

export const COL_WIDTH = 128;
export const ROW_HEIGHT = 36;
export const LANE_HEIGHT = ROW_HEIGHT;
export const HEADER_HEIGHT = 44;
export const MEMO_ROW_HEIGHT = 28;
export const LABEL_WIDTH = 40;

export const STORAGE_KEY = 'meal-planner-data';

export const formatDate = (d) => {
  const date = new Date(d);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
};

export const addDays = (dateStr, n) => {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  return formatDate(d);
};

export const getDayOfWeek = (dateStr) => {
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  return days[new Date(dateStr).getDay()];
};

export const getDateRange = (centerDate, before = 14, after = 14) => {
  const dates = [];
  for (let i = -before; i <= after; i++) {
    dates.push(addDays(centerDate, i));
  }
  return dates;
};

export const today = () => formatDate(new Date());

export const genId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
