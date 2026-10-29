"use client";
import { AnimatePresence, Reorder, motion } from "framer-motion";
import {
  ArrowDownUp, ClipboardList, LogOut, Plus, Search, SearchX, Sparkles, X, Eraser,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";
import { daysUntil } from "@/lib/dates";
import type { PublicUser, Todo } from "@/lib/types";
import Modal from "./Modal";
import Stats from "./Stats";
import ThemeToggle from "./ThemeToggle";
import { useToast } from "./Toasts";
import TodoForm, { type TodoDraft } from "./TodoForm";
import TodoItem from "./TodoItem";

type Filter = "all" | "active" | "done";
type Sort = "manual" | "newest" | "due" | "priority" | "title";
const PRIO_RANK = { high: 0, medium: 1, low: 2 };

const SORTS: { id: Sort; label: string }[] = [
  { id: "manual", label: "Manual order" },
  { id: "newest", label: "Newest first" },
  { id: "due", label: "Due date" },
  { id: "priority", label: "Priority" },
  { id: "title", label: "A → Z" },
];

export default function TodoApp({ user }: { user: PublicUser }) {
  const router = useRouter();
  const toast = useToast();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("manual");
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Todo | null>(null);
  const [deleting, setDeleting] = useState<Todo | null>(null);
  const [clearOpen, setClearOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const reload = useCallback(async () => {
    try {
      setTodos((await api<{ todos: Todo[] }>("/api/todos")).todos);
    } catch (e) {
      toast({ kind: "error", title: (e as Error).message });
    }
  }, [toast]);

  useEffect(() => {
    reload().finally(() => setLoading(false));
  }, [reload]);

  // Keyboard shortcuts: "n" new todo, "/" search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.closest("input,textarea,select,[role=dialog]") || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "n") { e.preventDefault(); openAdd(); }
      if (e.key === "/") { e.preventDefault(); searchRef.current?.focus(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const openAdd = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (t: Todo) => { setEditing(t); setFormOpen(true); };

  /* ---------------- mutations (optimistic, roll back on failure) ---------------- */
  async function save(draft: TodoDraft) {
    setFormOpen(false);
    if (editing) {
      const id = editing.id;
      setTodos((l) => l.map((t) => (t.id === id ? { ...t, ...draft } : t)));
      try {
        await api(`/api/todos/${id}`, { method: "PATCH", body: draft });
        toast({ title: "Todo updated" });
      } catch (e) {
        toast({ kind: "error", title: (e as Error).message });
        reload();
      }
    } else {
      try {
        const { todo } = await api<{ todo: Todo }>("/api/todos", { method: "POST", body: draft });
        setTodos((l) => [todo, ...l]);
        toast({ title: "Todo added" });
      } catch (e) {
        toast({ kind: "error", title: (e as Error).message });
      }
    }
  }

  async function toggle(t: Todo) {
    const completed = !t.completed;
    const stamp = completed ? new Date().toISOString() : null;
    setTodos((l) => l.map((x) => (x.id === t.id ? { ...x, completed, completedAt: stamp } : x)));
    try {
      await api(`/api/todos/${t.id}`, { method: "PATCH", body: { completed } });
    } catch (e) {
      toast({ kind: "error", title: (e as Error).message });
      reload();
    }
  }

  async function remove(t: Todo) {
    setDeleting(null);
    setTodos((l) => l.filter((x) => x.id !== t.id));
    try {
      await api(`/api/todos/${t.id}`, { method: "DELETE" });
      toast({
        title: "Todo deleted",
        action: {
          label: "Undo",
          onClick: async () => {
            try {
              await api("/api/todos", { method: "POST", body: { ...t, restore: t } });
              reload();
            } catch (e) {
              toast({ kind: "error", title: (e as Error).message });
            }
          },
        },
      });
    } catch (e) {
      toast({ kind: "error", title: (e as Error).message });
      reload();
    }
  }

  async function clearCompleted() {
    setClearOpen(false);
    const gone = todos.filter((t) => t.completed);
    setTodos((l) => l.filter((t) => !t.completed));
    try {
      await api("/api/todos/clear-completed", { method: "POST" });
      toast({
        title: `Cleared ${gone.length} completed ${gone.length === 1 ? "todo" : "todos"}`,
        action: {
          label: "Undo",
          onClick: async () => {
            await Promise.all(gone.map((t) => api("/api/todos", { method: "POST", body: { ...t, restore: t } }).catch(() => {})));
            reload();
          },
        },
      });
    } catch (e) {
      toast({ kind: "error", title: (e as Error).message });
      reload();
    }
  }

  async function reorder(next: Todo[]) {
    setTodos(next);
  }
  async function persistOrder() {
    try {
      await api("/api/todos/reorder", { method: "POST", body: { ids: todos.map((t) => t.id) } });
    } catch (e) {
      toast({ kind: "error", title: (e as Error).message });
      reload();
    }
  }

  async function logout() {
    await api("/api/auth/logout", { method: "POST" });
    router.replace("/signin");
    router.refresh();
  }

  /* ---------------- derived list ---------------- */
  const allTags = useMemo(() => [...new Set(todos.flatMap((t) => t.tags))].sort(), [todos]);
  const stats = useMemo(() => ({
    total: todos.length,
    done: todos.filter((t) => t.completed).length,
    overdue: todos.filter((t) => !t.completed && t.dueDate && daysUntil(t.dueDate) < 0).length,
  }), [todos]);

  const filtering = filter !== "all" || !!query.trim() || !!tag;
  const canDrag = sort === "manual" && !filtering;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = todos.filter(
      (t) =>
        (filter === "all" || (filter === "done") === t.completed) &&
        (!tag || t.tags.includes(tag)) &&
        (!q || t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) || t.tags.some((x) => x.includes(q))),
    );
    if (sort !== "manual") {
      list = [...list].sort((a, b) => {
        switch (sort) {
          case "newest": return b.createdAt.localeCompare(a.createdAt);
          case "due": return (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999");
          case "priority": return PRIO_RANK[a.priority] - PRIO_RANK[b.priority];
          case "title": return a.title.localeCompare(b.title);
        }
      });
    }
    return list;
  }, [todos, filter, tag, query, sort]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const completedCount = stats.done;

  return (
    <main className="mx-auto max-w-3xl px-3 pb-24 pt-5 sm:px-6">
      {/* header */}
      <motion.header initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/checkmark.png" alt="" className="size-9" />
          <div className="min-w-0">
            <h1 className="font-supercell text-2xl tracking-wide text-sky-500 dark:text-sky-300">ToDo App</h1>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">{greeting}, {user.name.split(" ")[0]} 👋</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <motion.button whileTap={{ scale: 0.9 }} onClick={logout} aria-label="Sign out" title="Sign out" className="glass grid size-10 place-items-center rounded-xl text-rose-500 dark:text-rose-300">
            <LogOut className="size-5" />
          </motion.button>
        </div>
      </motion.header>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mt-6 space-y-4">
        <Stats {...stats} />

        {/* actions */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
          <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.95 }} onClick={openAdd} className="btn bg-gradient-to-r from-sky-500 to-indigo-500 text-lg shadow-lg shadow-sky-500/30">
            <Plus className="size-5" /> Add Todo
            <kbd className="ml-1 hidden rounded bg-white/20 px-1.5 text-xs sm:inline">N</kbd>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.95 }}
            onClick={() => (completedCount ? setClearOpen(true) : toast({ kind: "warning", title: "No completed todos to clear" }))}
            className="btn bg-gradient-to-r from-sky-500 to-indigo-500 text-lg shadow-lg shadow-sky-500/30"
          >
            <Eraser className="size-5" /> Clear Completed
          </motion.button>
        </div>

        {/* search / filter / sort */}
        <div className="glass space-y-3 rounded-2xl p-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input ref={searchRef} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search todos…  ( / )" className="field pl-9 pr-8" />
              {query && (
                <button onClick={() => setQuery("")} aria-label="Clear search" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X className="size-4" />
                </button>
              )}
            </div>
            <label className="relative">
              <ArrowDownUp className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Sort todos" className="field w-auto cursor-pointer pl-9 pr-3">
                {SORTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-xl bg-slate-200/70 p-1 dark:bg-black/30">
              {(["all", "active", "done"] as Filter[]).map((f) => (
                <button key={f} onClick={() => setFilter(f)} className="relative rounded-lg px-3 py-1 font-supercell text-sm capitalize tracking-wide">
                  {filter === f && <motion.span layoutId="filter-pill" className="absolute inset-0 rounded-lg bg-sky-500" transition={{ type: "spring", stiffness: 500, damping: 35 }} />}
                  <span className={`relative ${filter === f ? "text-white" : "text-slate-500 dark:text-slate-400"}`}>{f}</span>
                </button>
              ))}
            </div>
            <AnimatePresence>
              {tag && (
                <motion.button initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} onClick={() => setTag(null)} className="flex items-center gap-1 rounded-full bg-sky-500 px-2.5 py-1 text-xs text-white">
                  #{tag} <X className="size-3" />
                </motion.button>
              )}
            </AnimatePresence>
            {!tag && allTags.slice(0, 6).map((t) => (
              <button key={t} onClick={() => setTag(t)} className="rounded-full bg-slate-200/80 px-2.5 py-1 text-xs text-slate-600 transition hover:bg-sky-500/20 dark:bg-white/10 dark:text-slate-300">
                #{t}
              </button>
            ))}
          </div>
        </div>

        {/* list */}
        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="relative h-[76px] overflow-hidden rounded-2xl bg-slate-200/70 dark:bg-white/5">
                <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/30 to-transparent dark:via-white/10" />
              </div>
            ))}
          </div>
        ) : visible.length === 0 ? (
          <EmptyState filtering={filtering} onAdd={openAdd} onReset={() => { setFilter("all"); setQuery(""); setTag(null); }} />
        ) : (
          <>
            <Reorder.Group axis="y" values={visible} onReorder={reorder} className="space-y-3">
              <AnimatePresence initial={false}>
                {visible.map((t) => (
                  <TodoItem key={t.id} todo={t} canDrag={canDrag} onDragEnd={persistOrder} onToggle={() => toggle(t)} onEdit={() => openEdit(t)} onDelete={() => setDeleting(t)} onTag={setTag} />
                ))}
              </AnimatePresence>
            </Reorder.Group>
            {canDrag && visible.length > 1 && (
              <p className="pt-1 text-center text-xs text-slate-400">Drag the handle to reorder</p>
            )}
          </>
        )}
      </motion.div>

      <TodoForm open={formOpen} todo={editing} allTags={allTags} onClose={() => setFormOpen(false)} onSubmit={save} />

      <Modal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title={<>Delete todo?</>}
        footer={
          <>
            <button onClick={() => setDeleting(null)} className="btn bg-emerald-500 hover:bg-emerald-600">Cancel</button>
            <button onClick={() => deleting && remove(deleting)} className="btn bg-red-500 hover:bg-red-600">Delete</button>
          </>
        }
      >
        <p className="font-supercell text-lg tracking-wide">Are you sure you want to delete &ldquo;{deleting?.title}&rdquo;?</p>
        <p className="mt-1 text-sm text-slate-500">You&apos;ll be able to undo this right after.</p>
      </Modal>

      <Modal
        open={clearOpen}
        onClose={() => setClearOpen(false)}
        title="Clear completed?"
        footer={
          <>
            <button onClick={() => setClearOpen(false)} className="btn bg-emerald-500 hover:bg-emerald-600">Cancel</button>
            <button onClick={clearCompleted} className="btn bg-red-500 hover:bg-red-600">Clear {completedCount}</button>
          </>
        }
      >
        <p className="font-supercell text-lg tracking-wide">
          Remove {completedCount} completed {completedCount === 1 ? "todo" : "todos"}?
        </p>
      </Modal>
    </main>
  );
}

function EmptyState({ filtering, onAdd, onReset }: { filtering: boolean; onAdd: () => void; onReset: () => void }) {
  const Icon = filtering ? SearchX : ClipboardList;
  return (
    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="glass flex flex-col items-center gap-3 rounded-2xl px-6 py-14 text-center">
      <motion.div animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}>
        <Icon className="size-14 text-sky-400" />
      </motion.div>
      <h2 className="font-supercell text-2xl tracking-wide">{filtering ? "Nothing matches" : "All clear!"}</h2>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        {filtering ? "Try a different search or filter." : "You have no todos yet. Add your first one to get going."}
      </p>
      <button onClick={filtering ? onReset : onAdd} className="btn bg-gradient-to-r from-sky-500 to-indigo-500">
        {filtering ? <><X className="size-4" /> Reset filters</> : <><Sparkles className="size-4" /> Add a todo</>}
      </button>
    </motion.div>
  );
}
