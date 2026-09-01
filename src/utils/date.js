export const atUtc = (value) => new Date(`${value}T00:00:00Z`);
export const toIso = (date) => date.toISOString().slice(0, 10);
export const plusDays = (date, amount) => new Date(date.getTime() + amount * 86_400_000);
export const diffDays = (a, b) => Math.round((a.getTime() - b.getTime()) / 86_400_000);
export const shortDate = (date) => `${date.getUTCMonth() + 1}/${date.getUTCDate()}`;
export const weekday = (date) => ["日", "一", "二", "三", "四", "五", "六"][date.getUTCDay()];
export const isWeekend = (date) => [0, 6].includes(date.getUTCDay());
