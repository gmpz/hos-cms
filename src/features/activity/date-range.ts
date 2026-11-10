export type ActivityDateRange = { period: "today" | "yesterday" | "week" | "custom"; start: string; end: string };
type Params = Record<string, string | string[] | undefined>;
const dayMs = 86400000;

export function validActivityDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function activityDateRange(params: Params, now: Date): ActivityDateRange {
  const today = new Date(now.getTime() + 7 * 3600000).toISOString().slice(0, 10);
  const shift = (days: number) => new Date(Date.parse(`${today}T00:00:00Z`) + days * dayMs).toISOString().slice(0, 10);
  if (params.period === "yesterday") return { period: "yesterday", start: shift(-1), end: shift(-1) };
  if (params.period === "week") return { period: "week", start: shift(-6), end: today };
  if (params.period === "custom" && validActivityDate(params.start) && validActivityDate(params.end) && params.start <= params.end)
    return { period: "custom", start: params.start, end: params.end };
  return { period: params.period === "custom" ? "custom" : "today", start: today, end: today };
}

export function activityDateBounds(range: ActivityDateRange) {
  return { gte: new Date(`${range.start}T00:00:00+07:00`), lt: new Date(Date.parse(`${range.end}T00:00:00+07:00`) + dayMs) };
}

export function setActivityDateParams(params: URLSearchParams, range: ActivityDateRange) {
  params.set("period", range.period);
  if (range.period === "custom") { params.set("start", range.start); params.set("end", range.end); }
}
