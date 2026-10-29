const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};
const parse = (ymd: string) => {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d);
};

export const todayYmd = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** Whole days from today until the date (negative = overdue). */
export const daysUntil = (ymd: string) => Math.round((parse(ymd).getTime() - startOfToday().getTime()) / 86400000);

export function dueLabel(ymd: string): { text: string; tone: "overdue" | "soon" | "later" } {
  const n = daysUntil(ymd);
  if (n < -1) return { text: `${-n} days overdue`, tone: "overdue" };
  if (n === -1) return { text: "Yesterday", tone: "overdue" };
  if (n === 0) return { text: "Today", tone: "soon" };
  if (n === 1) return { text: "Tomorrow", tone: "soon" };
  if (n < 7) return { text: parse(ymd).toLocaleDateString(undefined, { weekday: "long" }), tone: "later" };
  return { text: parse(ymd).toLocaleDateString(undefined, { month: "short", day: "numeric" }), tone: "later" };
}

export const fullDate = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { dateStyle: "long", timeStyle: "short" });
