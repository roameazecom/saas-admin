/**
 * Central IST (Indian Standard Time) date/time formatting utilities.
 * All date/time display across the app should use these helpers.
 * This ensures consistent IST (UTC+5:30 / Asia/Kolkata) output on every device.
 */

const TZ = 'Asia/Kolkata';
const LOCALE = 'en-IN';

/**
 * Normalize a date string from MySQL (which may lack timezone info) to a proper Date object in IST.
 * MySQL returns "2026-06-28 12:30:00" (no timezone). We treat this as IST directly.
 */
export function parseDate(dateInput) {
  if (!dateInput) return new Date();
  if (dateInput instanceof Date) return dateInput;
  if (typeof dateInput === 'number') return new Date(dateInput);

  let dateStr = String(dateInput).trim();
  if (!dateStr) return new Date();

  if (/^\d+$/.test(dateStr)) {
    return new Date(Number(dateStr));
  }

  if (!dateStr.includes('T') && dateStr.includes(' ')) {
    dateStr = dateStr.replace(' ', 'T');
  }

  const timePart = dateStr.slice(10);
  if (!timePart.includes('Z') && !timePart.includes('+') && !timePart.includes('-')) {
    dateStr += 'Z';
  }

  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

/**
 * Format date + time in IST.
 * Example output: "28 Jun 2026, 12:30 PM"
 */
export function formatIST(dateStr) {
  const d = parseDate(dateStr);
  return d.toLocaleString(LOCALE, {
    timeZone: TZ,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Format only time in IST.
 * Example output: "12:30 PM"
 */
export function formatTimeIST(dateStr) {
  const d = parseDate(dateStr);
  return d.toLocaleTimeString(LOCALE, {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Format only date in IST.
 * Example output: "28 Jun 2026"
 */
export function formatDateIST(dateStr) {
  const d = parseDate(dateStr);
  return d.toLocaleDateString(LOCALE, {
    timeZone: TZ,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Format date in YYYY-MM-DD format in IST (useful for comparisons/filtering).
 * Example output: "2026-06-28"
 */
export function formatDateKeyIST(dateStr) {
  const d = parseDate(dateStr);
  return d.toLocaleDateString('en-CA', { timeZone: TZ }); // en-CA gives YYYY-MM-DD
}

/**
 * Get today's date as YYYY-MM-DD in IST.
 */
export function todayIST() {
  return new Date().toLocaleDateString('en-CA', { timeZone: TZ });
}
