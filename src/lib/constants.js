export const SERVER_URL =
  import.meta.env.VITE_SERVER_URL || 'https://esm-famil-server.onrender.com';

export const CATS = [
  { id: 'name', n: 'اسم', i: '👤' },
  { id: 'family', n: 'فامیل', i: '👨‍👩‍👧‍👦' },
  { id: 'city', n: 'شهر', i: '🏙️' },
  { id: 'country', n: 'کشور', i: '🌍' },
  { id: 'food', n: 'غذا', i: '🍲' },
  { id: 'fruit', n: 'میوه', i: '🍎' },
  { id: 'animal', n: 'حیوان', i: '🐾' },
  { id: 'color', n: 'رنگ', i: '🎨' },
  { id: 'car', n: 'ماشین', i: '🚗' },
  { id: 'flower', n: 'گل', i: '🌸' },
  { id: 'objects', n: 'اشیاء', i: '📦' },
];

export const CLRS = ['#7c3aed', '#2563eb', '#059669', '#d97706', '#db2777', '#0891b2'];

export function pn(n) {
  return String(n ?? 0).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d]);
}

export function loadHistory() {
  try {
    const h = JSON.parse(localStorage.getItem('esm_history') || '[]');
    return Array.isArray(h) ? h : [];
  } catch {
    return [];
  }
}

export function saveHistoryEntry(entry) {
  try {
    const h = loadHistory();
    const same =
      h[0] &&
      h[0].date === entry.date &&
      h[0].time === entry.time &&
      h[0].myScore === entry.myScore;
    if (!same) {
      h.unshift(entry);
      if (h.length > 50) h.length = 50;
      localStorage.setItem('esm_history', JSON.stringify(h));
    }
    return h;
  } catch {
    return loadHistory();
  }
}
