export function formatDate(date: Date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}.${m}.${d}`;
}

export function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

/** Rough reading time for mixed Chinese/English text (~400 CJK chars per minute). */
export function readingMinutes(body = '') {
  const text = body
    .replace(/^---[\s\S]*?---/, '')
    .replace(/<[^>]+>/g, '')
    .replace(/[#*|`>\-]/g, '');
  const cjk = (text.match(/[\u4e00-\u9fff]/g) ?? []).length;
  const words = (text.replace(/[\u4e00-\u9fff]/g, ' ').match(/[A-Za-z]+/g) ?? []).length;
  return Math.max(1, Math.round(cjk / 400 + words / 220));
}
