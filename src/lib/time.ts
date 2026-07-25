const relative = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

/** Unit paired with how many of it fit in the next unit up. */
const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["second", 60],
  ["minute", 60],
  ["hour", 24],
  ["day", 7],
];

/** Math.round breaks ties toward +Infinity, which skews past timestamps. */
const round = (value: number) => Math.sign(value) * Math.round(Math.abs(value));

/** "12 seconds ago", "3 minutes ago" - Intl handles the wording and plurals. */
export function formatRelative(timestamp: number, now: number = Date.now()): string {
  let value = round((timestamp - now) / 1000);
  for (const [unit, perNext] of UNITS) {
    if (Math.abs(value) < perNext) return relative.format(value, unit);
    value = round(value / perNext);
  }
  return relative.format(value, "week");
}

/** Wall-clock time for the activity timeline: "10:42". */
export function formatClock(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}
