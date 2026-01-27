// ──────────────────────────────────────────────
// Relative time formatting utilities
// ──────────────────────────────────────────────

const MINUTE = 60;
const HOUR = MINUTE * 60;
const DAY = HOUR * 24;
const WEEK = DAY * 7;
const MONTH = DAY * 30;
const YEAR = DAY * 365;

/**
 * Format a date string as relative time (e.g., "5 minutes ago").
 */
export function timeAgo(dateString: string): string {
  const now = Date.now();
  const date = new Date(dateString).getTime();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 0) return 'just now';
  if (seconds < 30) return 'just now';
  if (seconds < MINUTE) return `${seconds}s ago`;
  if (seconds < HOUR) {
    const m = Math.floor(seconds / MINUTE);
    return `${m}m ago`;
  }
  if (seconds < DAY) {
    const h = Math.floor(seconds / HOUR);
    return `${h}h ago`;
  }
  if (seconds < WEEK) {
    const d = Math.floor(seconds / DAY);
    return `${d}d ago`;
  }
  if (seconds < MONTH) {
    const w = Math.floor(seconds / WEEK);
    return `${w}w ago`;
  }
  if (seconds < YEAR) {
    const m = Math.floor(seconds / MONTH);
    return `${m}mo ago`;
  }
  const y = Math.floor(seconds / YEAR);
  return `${y}y ago`;
}

/**
 * Group a date into display categories for notification grouping.
 */
export function getDateGroup(dateString: string): 'Today' | 'Yesterday' | 'Earlier' {
  const now = new Date();
  const date = new Date(dateString);

  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart.getTime() - DAY * 1000);

  if (date >= todayStart) return 'Today';
  if (date >= yesterdayStart) return 'Yesterday';
  return 'Earlier';
}

/**
 * Format a date as a short readable string.
 */
export function formatShortDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}
