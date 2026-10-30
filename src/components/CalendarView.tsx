"use client";
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameMonth, isToday, parseISO, startOfMonth, startOfWeek } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarDays, ChevronLeft, ChevronRight, Pencil, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { todayYmd } from "@/lib/dates";
import type { Priority, Todo } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { RoundCheckbox } from "./ui/checkbox";

const PRIORITY_BAR: Record<Priority, string> = { low: "bg-prio-low", medium: "bg-prio-medium", high: "bg-prio-high" };
const RANK: Record<Priority, number> = { high: 0, medium: 1, low: 2 };
const ymd = (d: Date) => format(d, "yyyy-MM-dd");

type WeekDay = 0 | 1 | 2 | 3 | 4 | 5 | 6;
/** First day of the week for the viewer's locale (falls back to Monday). */
function localeWeekStart(): WeekDay {
  try {
    const loc = new Intl.Locale(navigator.language) as Intl.Locale & { getWeekInfo?: () => { firstDay: number }; weekInfo?: { firstDay: number } };
    const first = (loc.getWeekInfo?.() ?? loc.weekInfo)?.firstDay;
    if (first) return (first === 7 ? 0 : first) as WeekDay;
  } catch {}
  return 1;
}

interface Props {
  todos: Todo[]; // already filtered by search / status / tags
  onToggle: (t: Todo) => void;
  onEdit: (t: Todo) => void;
  onAdd: (dueDate: string) => void;
}

export default function CalendarView({ todos, onToggle, onEdit, onAdd }: Props) {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selected, setSelected] = useState(todayYmd());
  const [weekStart, setWeekStart] = useState<WeekDay>(1);
  useEffect(() => setWeekStart(localeWeekStart()), []);

  const byDay = useMemo(() => {
    const m = new Map<string, Todo[]>();
    for (const t of todos) if (t.dueDate) m.set(t.dueDate, [...(m.get(t.dueDate) ?? []), t]);
    for (const list of m.values()) list.sort((a, b) => Number(a.completed) - Number(b.completed) || RANK[a.priority] - RANK[b.priority]);
    return m;
  }, [todos]);

  const days = useMemo(
    () => eachDayOfInterval({ start: startOfWeek(month, { weekStartsOn: weekStart }), end: endOfWeek(endOfMonth(month), { weekStartsOn: weekStart }) }),
    [month, weekStart],
  );
  const weekdays = days.slice(0, 7).map((d) => format(d, "EEE"));
  const today = todayYmd();
  const undated = todos.filter((t) => !t.dueDate).length;
  const monthTotal = [...byDay.entries()].filter(([k]) => isSameMonth(parseISO(k), month)).reduce((n, [, l]) => n + l.length, 0);
  const dayTodos = byDay.get(selected) ?? [];

  const goToday = () => {
    setMonth(startOfMonth(new Date()));
    setSelected(today);
  };

  return (
    <div className="space-y-4">
      <div className="surface p-3 sm:p-4">
        {/* month header */}
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <AnimatePresence mode="wait" initial={false}>
              <motion.h2 key={format(month, "yyyy-MM")} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }} className="heading truncate text-xl sm:text-2xl">
                {format(month, "MMMM yyyy")}
              </motion.h2>
            </AnimatePresence>
            <p className="text-xs text-muted-foreground">{monthTotal} {monthTotal === 1 ? "deadline" : "deadlines"} this month</p>
          </div>
          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="icon-sm" aria-label="Previous month" onClick={() => setMonth((m) => addMonths(m, -1))}><ChevronLeft /></Button>
            <Button variant="outline" size="icon-sm" className="w-auto px-3 text-sm" onClick={goToday}>Today</Button>
            <Button variant="outline" size="icon-sm" aria-label="Next month" onClick={() => setMonth((m) => addMonths(m, 1))}><ChevronRight /></Button>
          </div>
        </div>

        {/* grid */}
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium uppercase text-muted-foreground sm:text-xs">
          {weekdays.map((d) => <div key={d} className="py-1">{d}</div>)}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1" role="grid" aria-label={format(month, "MMMM yyyy")}>
          {days.map((d) => {
            const key = ymd(d);
            const list = byDay.get(key) ?? [];
            const open = list.filter((t) => !t.completed);
            const overdue = key < today && open.length > 0;
            const inMonth = isSameMonth(d, month);
            const isSel = key === selected;
            return (
              <button
                key={key}
                role="gridcell"
                aria-selected={isSel}
                aria-label={`${format(d, "EEEE, d MMMM")}: ${list.length} ${list.length === 1 ? "todo" : "todos"}`}
                onClick={() => {
                  setSelected(key);
                  if (!inMonth) setMonth(startOfMonth(d));
                }}
                className={cn(
                  "flex min-h-14 flex-col items-stretch gap-1 rounded-lg border p-1 text-left outline-none transition sm:min-h-24 sm:p-1.5",
                  "focus-visible:ring-4 focus-visible:ring-primary/25",
                  isSel ? "border-primary bg-primary/10" : "border-transparent bg-muted/40 hover:border-border hover:bg-muted/70",
                  !inMonth && "opacity-45",
                )}
              >
                <span className={cn("grid size-6 place-items-center self-start rounded-full text-xs font-medium sm:text-sm", isToday(d) && "bg-primary text-primary-foreground", overdue && !isToday(d) && "text-destructive")}>
                  {format(d, "d")}
                </span>
                {/* wide screens: titles */}
                <span className="hidden min-w-0 flex-col gap-0.5 sm:flex">
                  {list.slice(0, 3).map((t) => (
                    <span key={t.id} className={cn("flex min-w-0 items-center gap-1 rounded bg-card px-1 py-0.5 text-[11px] leading-tight", t.completed ? "text-muted-foreground line-through" : key < today ? "text-destructive" : "text-foreground")}>
                      <span className={cn("h-3 w-0.5 shrink-0 rounded-full", PRIORITY_BAR[t.priority])} />
                      <span className="truncate">{t.title}</span>
                    </span>
                  ))}
                  {list.length > 3 && <span className="px-1 text-[11px] text-muted-foreground">+{list.length - 3} more</span>}
                </span>
                {/* phones: dots */}
                <span className="flex flex-wrap gap-0.5 px-0.5 sm:hidden">
                  {list.slice(0, 4).map((t) => <span key={t.id} className={cn("size-1.5 rounded-full", t.completed ? "bg-muted-foreground/40" : PRIORITY_BAR[t.priority])} />)}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
          {(["high", "medium", "low"] as Priority[]).map((p) => (
            <span key={p} className="flex items-center gap-1.5"><span className={cn("size-2 rounded-full", PRIORITY_BAR[p])} /> {p[0].toUpperCase() + p.slice(1)}</span>
          ))}
          <span className="ml-auto">{undated > 0 ? `${undated} without a due date` : "Every todo has a due date"}</span>
        </div>
      </div>

      {/* selected day */}
      <div className="surface p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CalendarDays className="size-5 text-primary" />
            <h3 className="heading text-lg">{selected === today ? "Today" : format(parseISO(selected), "EEEE, d MMMM")}</h3>
            {selected === today && <span className="text-sm text-muted-foreground">{format(parseISO(selected), "d MMMM")}</span>}
          </div>
          <Button size="icon-sm" className="w-auto gap-1.5 px-3 text-sm" onClick={() => onAdd(selected)}><Plus /> Add</Button>
        </div>
        {dayTodos.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">Nothing due on this day.</p>
        ) : (
          <ul className="divide-y divide-border">
            <AnimatePresence initial={false}>
              {dayTodos.map((t) => (
                <motion.li key={t.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-3 py-2.5">
                  <span className={cn("h-8 w-1 shrink-0 rounded-full", PRIORITY_BAR[t.priority])} title={`${t.priority} priority`} />
                  <RoundCheckbox checked={t.completed} label={`Mark "${t.title}" as ${t.completed ? "not done" : "done"}`} onCheckedChange={() => onToggle(t)} />
                  <div className="min-w-0 flex-1">
                    <p className={cn("heading truncate text-base", t.completed && "text-muted-foreground line-through")}>{t.title}</p>
                    {(t.description || t.tags.length > 0) && (
                      <p className="truncate text-xs text-muted-foreground">{[t.description, ...t.tags.map((x) => `#${x}`)].filter(Boolean).join(" · ")}</p>
                    )}
                  </div>
                  <Button variant="ghost" size="icon-sm" aria-label={`Edit "${t.title}"`} onClick={() => onEdit(t)}><Pencil className="!size-4" /></Button>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </div>
  );
}
