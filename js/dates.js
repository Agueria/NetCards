// dates.js - pure date helpers (no DOM, no storage). All "day" math uses the user's local calendar.
//
// Timestamps in the app are plain numbers (milliseconds since 1970, what Date.now() returns);
// they are easy to store in IndexedDB and to compare with <=.
export const DAY_MS = 24 * 60 * 60 * 1000;

/** 'YYYY-MM-DD' in local time - used to group reviews by day on the Stats screen. */
export function dayKey(ms) {
  const d = new Date(ms);
  const month = String(d.getMonth() + 1).padStart(2, '0'); // getMonth() is 0-based
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

export function todayKey(now = Date.now()) {
  return dayKey(now);
}

/**
 * Adds whole calendar days. We use setDate() instead of adding 24h because a day is not always
 * 24 hours: around daylight-saving changes it is 23 or 25, and "now - 24h" could skip a date.
 */
export function shiftDays(ms, deltaDays) {
  const d = new Date(ms);
  d.setDate(d.getDate() + deltaDays); // JavaScript rolls over month ends correctly
  return d.getTime();
}

/** Human text for a card's due time: 'due now', 'due tomorrow', 'due in 3 days'. */
export function formatDue(due, now = Date.now()) {
  if (due <= now) return 'due now';
  const days = Math.ceil((due - now) / DAY_MS); // any part of a day counts as a full day
  return days === 1 ? 'due tomorrow' : `due in ${days} days`;
}
