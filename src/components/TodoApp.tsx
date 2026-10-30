"use client";
import { AnimatePresence, Reorder, motion } from "framer-motion";
import { ArrowDownUp, Check, ChevronDown, ClipboardList, Eraser, HardDrive, LogOut, Plus, RefreshCw, Search, SearchX, Settings, Sparkles, Tags, X } from "lucide-react";
import { Popover } from "radix-ui";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";
import { daysUntil } from "@/lib/dates";
import { readLocal, syncNow, syncSummary, timeAgo, writeLocal } from "@/lib/localStore";
import { notify } from "@/lib/notify";
import { countPending } from "@/lib/sync";
import type { PublicUser, Todo } from "@/lib/types";
import { cn } from "@/lib/utils";
import Logo from "./Logo";
import Stats from "./Stats";
import ThemeToggle from "./ThemeToggle";
import { Button } from "./ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent } from "./ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { SegmentedControl } from "./ui/toggle-group";
import TodoForm, { type TodoDraft } from "./TodoForm";
import TodoItem from "./TodoItem";

type Filter = "all" | "active" | "done";
type Sort = "manual" | "newest" | "due" | "priority" | "title";
/** cloud = every change goes straight to the server; local = changes stay in this browser until "Sync" */
type Mode = "unknown" | "cloud" | "local";
const PRIO_RANK = { high: 0, medium: 1, low: 2 };

const SORTS: { id: Sort; label: string }[] = [
  { id: "manual", label: "Manual order" },
  { id: "newest", label: "Newest first" },
  { id: "due", label: "Due date" },
  { id: "priority", label: "Priority" },
  { id: "title", label: "A \u2192 Z" },
];

export default function TodoApp({ user }: { user: PublicUser }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("unknown");
  const [todos, setTodos] = useState<Todo[]>([]);
  const [base, setBase] = useState<Todo[]>([]); // local mode: the server's todos as of the last sync
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(true);
  const phase = useSkeletonPhase(loading);
  const prefsLoaded = useRef(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("manual");
  const [query, setQuery] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Todo | null>(null);
  const [deleting, setDeleting] = useState<Todo | null>(null);
  const [clearOpen, setClearOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const local = mode === "local";

  const reload = useCallback(async () => {
    try {
      setTodos((await api<{ todos: Todo[] }>("/api/todos")).todos);
    } catch (e) {
      notify.error((e as Error).message);
    }
  }, []);

  // Decide where todos live: a saved local copy means local-only mode, otherwise the server.
  useEffect(() => {
    const saved = readLocal(user.id);
    if (saved) {
      setMode("local");
      setTodos(saved.todos);
      setBase(saved.base);
      setLastSyncAt(saved.lastSyncAt);
      setLoading(false);
    } else {
      setMode("cloud");
      reload().finally(() => setLoading(false));
    }
  }, [user.id, reload]);

  // Local mode: every change is written to this browser straight away.
  const warnedStorage = useRef(false);
  useEffect(() => {
    if (!local || loading) return;
    if (!writeLocal(user.id, { todos, base, lastSyncAt }) && !warnedStorage.current) {
      warnedStorage.current = true;
      notify.error("Couldn't save to this browser's storage. Sync soon so you don't lose changes.");
    }
  }, [local, loading, todos, base, lastSyncAt, user.id]);

  const pending = useMemo(() => (local ? countPending(base, todos) : 0), [local, base, todos]);

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

  // List preferences (sort order, status filter, tag filter) are remembered per user in this browser.
  const prefsKey = `todo-next:prefs:${user.id}`;
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(prefsKey) ?? "null");
      if (SORTS.some((o) => o.id === saved?.sort)) setSort(saved.sort);
      if (["all", "active", "done"].includes(saved?.filter)) setFilter(saved.filter);
      if (Array.isArray(saved?.tags)) setTags(saved.tags.filter((t: unknown) => typeof t === "string"));
      else if (typeof saved?.tag === "string") setTags([saved.tag]); // older single-tag format
    } catch {}
    prefsLoaded.current = true;
  }, [prefsKey]);
  useEffect(() => {
    if (!prefsLoaded.current) return; // don't overwrite saved values with defaults before they're read
    try {
      localStorage.setItem(prefsKey, JSON.stringify({ sort, filter, tags }));
    } catch {}
  }, [prefsKey, sort, filter, tags]);

  const openAdd = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (t: Todo) => { setEditing(t); setFormOpen(true); };
  const toggleTag = (t: string) => setTags((l) => (l.includes(t) ? l.filter((x) => x !== t) : [...l, t]));

  /* ---------------- mutations ----------------
     cloud: optimistic update, then the server call (rolled back by reloading on failure)
     local: just update state; the effect above saves it in this browser, nothing is sent until "Sync" */
  const busy = syncing; // changes are blocked while a sync is in flight so they can't be overwritten
  const stamp = () => new Date().toISOString();
  const restoreMany = (list: Todo[]) => setTodos((l) => [...l, ...list].sort((a, b) => a.order - b.order));

  async function save(draft: TodoDraft) {
    if (busy) return;
    setFormOpen(false);
    if (editing) {
      const id = editing.id;
      setTodos((l) => l.map((t) => (t.id === id ? { ...t, ...draft, updatedAt: stamp() } : t)));
      if (local) return notify.success("Todo updated");
      try {
        await api(`/api/todos/${id}`, { method: "PATCH", body: draft });
        notify.success("Todo updated");
      } catch (e) {
        notify.error((e as Error).message);
        reload();
      }
    } else if (local) {
      const now = stamp();
      const todo: Todo = {
        id: crypto.randomUUID(), ...draft, completed: false, completedAt: null,
        order: Math.min(0, ...todos.map((t) => t.order)) - 1, createdAt: now, updatedAt: now,
      };
      setTodos((l) => [todo, ...l]);
      notify.success("Todo added");
    } else {
      try {
        const { todo } = await api<{ todo: Todo }>("/api/todos", { method: "POST", body: draft });
        setTodos((l) => [todo, ...l]);
        notify.success("Todo added");
      } catch (e) {
        notify.error((e as Error).message);
      }
    }
  }

  async function toggle(t: Todo) {
    if (busy) return;
    const completed = !t.completed;
    const now = stamp();
    setTodos((l) => l.map((x) => (x.id === t.id ? { ...x, completed, completedAt: completed ? now : null, updatedAt: now } : x)));
    if (local) return;
    try {
      await api(`/api/todos/${t.id}`, { method: "PATCH", body: { completed } });
    } catch (e) {
      notify.error((e as Error).message);
      reload();
    }
  }

  async function remove(t: Todo) {
    if (busy) return;
    setDeleting(null);
    setTodos((l) => l.filter((x) => x.id !== t.id));
    if (local) return notify.success("Todo deleted", { label: "Undo", onClick: () => restoreMany([t]) });
    try {
      await api(`/api/todos/${t.id}`, { method: "DELETE" });
      notify.success("Todo deleted", {
        label: "Undo",
        onClick: async () => {
          try {
            await api("/api/todos", { method: "POST", body: { ...t, restore: t } });
            reload();
          } catch (e) {
            notify.error((e as Error).message);
          }
        },
      });
    } catch (e) {
      notify.error((e as Error).message);
      reload();
    }
  }

  async function clearCompleted() {
    if (busy) return;
    setClearOpen(false);
    const gone = todos.filter((t) => t.completed);
    const message = `Cleared ${gone.length} completed ${gone.length === 1 ? "todo" : "todos"}`;
    setTodos((l) => l.filter((t) => !t.completed));
    if (local) return notify.success(message, { label: "Undo", onClick: () => restoreMany(gone) });
    try {
      await api("/api/todos/clear-completed", { method: "POST" });
      notify.success(message, {
        label: "Undo",
        onClick: async () => {
          await Promise.all(gone.map((t) => api("/api/todos", { method: "POST", body: { ...t, restore: t } }).catch(() => {})));
          reload();
        },
      });
    } catch (e) {
      notify.error((e as Error).message);
      reload();
    }
  }

  function reorder(next: Todo[]) {
    setTodos(next);
  }
  async function persistOrder() {
    if (local) return setTodos((l) => l.map((t, i) => ({ ...t, order: i }))); // order values must match the list order for merging
    try {
      await api("/api/todos/reorder", { method: "POST", body: { ids: todos.map((t) => t.id) } });
    } catch (e) {
      notify.error((e as Error).message);
      reload();
    }
  }

  async function sync() {
    if (!local || syncing) return;
    setSyncing(true);
    try {
      const { state, stats } = await syncNow(user.id, { todos, base, lastSyncAt });
      setTodos(state.todos);
      setBase(state.base);
      setLastSyncAt(state.lastSyncAt);
      stats.conflicts ? notify.warning(syncSummary(stats)) : notify.success(syncSummary(stats));
    } catch (e) {
      notify.error(`Sync failed: ${(e as Error).message}. Your changes are still saved on this device.`);
    }
    setSyncing(false);
  }

  async function logout() {
    await api("/api/auth/logout", { method: "POST" });
    router.replace("/signin");
    router.refresh();
  }

  /* ---------------- derived list ---------------- */
  const allTags = useMemo(() => [...new Set(todos.flatMap((t) => t.tags))].sort(), [todos]);
  const tagCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of todos) for (const x of t.tags) m.set(x, (m.get(x) ?? 0) + 1);
    return m;
  }, [todos]);
  const stats = useMemo(() => ({
    total: todos.length,
    done: todos.filter((t) => t.completed).length,
    overdue: todos.filter((t) => !t.completed && t.dueDate && daysUntil(t.dueDate) < 0).length,
  }), [todos]);

  // Drop remembered tag filters that no todo uses any more.
  useEffect(() => {
    if (!loading && tags.some((t) => !allTags.includes(t))) setTags((l) => l.filter((t) => allTags.includes(t)));
  }, [loading, tags, allTags]);

  const filtering = filter !== "all" || !!query.trim() || tags.length > 0;
  const canDrag = sort === "manual" && !filtering;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = todos.filter(
      (t) =>
        (filter === "all" || (filter === "done") === t.completed) &&
        (tags.length === 0 || t.tags.some((x) => tags.includes(x))) &&
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
  }, [todos, filter, tags, query, sort]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const completedCount = stats.done;
  const resetFilters = () => { setFilter("all"); setQuery(""); setTags([]); };

  return (
    <main className="mx-auto max-w-3xl px-3 pb-24 pt-5 sm:px-6">
      {/* header */}
      <motion.header initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Logo className="size-9" />
          <div className="min-w-0">
            <h1 className="heading text-2xl text-primary">ToDo Next</h1>
            <p className="truncate text-xs text-muted-foreground">{greeting}, {user.name.split(" ")[0]}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-10 gap-1.5 px-2 pr-2.5" aria-label="Account menu">
                <span className="grid size-7 place-items-center rounded-lg bg-primary text-sm text-primary-foreground">
                  {user.name.charAt(0).toUpperCase()}
                </span>
                <ChevronDown className="text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>
                <span className="block font-medium text-foreground">{user.name}</span>
                {user.email}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => router.push("/settings")}><Settings /> Account settings</DropdownMenuItem>
              <DropdownMenuItem onSelect={logout} className="text-destructive"><LogOut /> Sign out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </motion.header>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mt-6 space-y-4">
        <Stats {...stats} />

        {local && (
          <div className="surface flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm">
            <span className="flex items-center gap-2 text-muted-foreground">
              <HardDrive className="size-4 text-primary" />
              <span>
                <span className="font-medium text-foreground">Local-only mode</span>
                {" · "}
                {pending > 0 ? <span className="font-medium text-primary">{pending} unsynced {pending === 1 ? "change" : "changes"}</span> : "all synced"}
                {" · last sync "}{timeAgo(lastSyncAt)}
              </span>
            </span>
            <Button size="icon-sm" variant={pending > 0 ? "default" : "outline"} className="w-auto gap-1.5 px-3 text-sm" onClick={sync} disabled={syncing}>
              <RefreshCw className={cn(syncing && "animate-spin")} /> {syncing ? "Syncing" : "Sync"}
            </Button>
          </div>
        )}

        {/* actions */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
          <Button size="lg" onClick={openAdd}>
            <Plus /> Add todo
            <kbd className="ml-1 hidden rounded bg-primary-foreground/20 px-1.5 text-xs sm:inline">N</kbd>
          </Button>
          <Button size="lg" onClick={() => (completedCount ? setClearOpen(true) : notify.warning("No completed todos to clear"))}>
            <Eraser /> Clear completed
          </Button>
        </div>

        {/* search / filter / sort */}
        <div className="surface space-y-3 p-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input ref={searchRef} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by title or tag" aria-label="Search todos" className="pl-9 pr-8" />
              {query && (
                <button onClick={() => setQuery("")} aria-label="Clear search" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="size-4" />
                </button>
              )}
            </div>
            <Select value={sort} onValueChange={(v) => setSort(v as Sort)}>
              <SelectTrigger aria-label="Sort todos" className="w-40 sm:w-44">
                <span className="flex items-center gap-2"><ArrowDownUp className="size-4 text-muted-foreground" /><SelectValue /></span>
              </SelectTrigger>
              <SelectContent>
                {SORTS.map((o) => <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <SegmentedControl
              label="Filter todos"
              value={filter}
              onChange={setFilter}
              options={[{ value: "all", label: "All" }, { value: "active", label: "Active" }, { value: "done", label: "Done" }]}
            />
            {allTags.length > 0 && <TagFilter tags={allTags} counts={tagCounts} selected={tags} onToggle={toggleTag} onClear={() => setTags([])} />}
            <AnimatePresence initial={false}>
              {tags.map((t) => (
                <motion.button
                  key={t}
                  layout
                  initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                  onClick={() => toggleTag(t)}
                  aria-label={`Remove tag filter ${t}`}
                  className="flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-xs text-primary-foreground"
                >
                  #{t} <X className="size-3" />
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* list */}
        {phase === "wait" ? null : phase === "skeleton" ? (
          <TodoSkeleton />
        ) : visible.length === 0 ? (
          <EmptyState filtering={filtering} onAdd={openAdd} onReset={resetFilters} />
        ) : (
          <div className={cn(syncing && "pointer-events-none opacity-60 transition-opacity")}>
            <Reorder.Group ref={listRef} as="ul" axis="y" values={visible} onReorder={reorder} className="space-y-3">
              <AnimatePresence initial={false}>
                {visible.map((t) => (
                  <TodoItem key={t.id} todo={t} canDrag={canDrag} constraintsRef={listRef} onDragEnd={persistOrder} onToggle={() => toggle(t)} onEdit={() => openEdit(t)} onDelete={() => setDeleting(t)} onTag={toggleTag} />
                ))}
              </AnimatePresence>
            </Reorder.Group>
            {canDrag && visible.length > 1 && (
              <p className="pt-3 text-center text-xs text-muted-foreground">Drag the handle to reorder</p>
            )}
          </div>
        )}
      </motion.div>

      <TodoForm open={formOpen} todo={editing} allTags={allTags} onClose={() => setFormOpen(false)} onSubmit={save} />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent
          title="Delete todo?"
          footer={
            <>
              <AlertDialogCancel asChild><Button variant="secondary">Keep it</Button></AlertDialogCancel>
              <AlertDialogAction asChild><Button variant="destructive" onClick={() => deleting && remove(deleting)}>Delete</Button></AlertDialogAction>
            </>
          }
        >
          <p className="heading text-lg">&ldquo;{deleting?.title}&rdquo; will be removed.</p>
          <p className="mt-1 text-sm text-muted-foreground">You can undo this right after.</p>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={clearOpen} onOpenChange={setClearOpen}>
        <AlertDialogContent
          title="Clear completed?"
          footer={
            <>
              <AlertDialogCancel asChild><Button variant="secondary">Cancel</Button></AlertDialogCancel>
              <AlertDialogAction asChild><Button variant="destructive" onClick={clearCompleted}>Clear {completedCount}</Button></AlertDialogAction>
            </>
          }
        >
          <p className="heading text-lg">
            Remove {completedCount} completed {completedCount === 1 ? "todo" : "todos"}?
          </p>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}

/** Compact multi-select tag filter in a popover, so a long tag list never clutters the page. */
function TagFilter({ tags, counts, selected, onToggle, onClear }: { tags: string[]; counts: Map<string, number>; selected: string[]; onToggle: (t: string) => void; onClear: () => void }) {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <Button variant="outline" size="icon-sm" className="h-[34px] w-auto gap-1.5 px-3 text-sm" aria-label="Filter by tag">
          <Tags /> Tags
          {selected.length > 0 && <span className="grid min-w-5 place-items-center rounded-full bg-primary px-1 text-[11px] leading-5 text-primary-foreground">{selected.length}</span>}
        </Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          className="z-50 w-60 rounded-xl border border-border bg-popover p-1.5 shadow-xl data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          <div className="max-h-64 overflow-y-auto">
            {tags.map((t) => {
              const on = selected.includes(t);
              return (
                <button
                  key={t}
                  role="menuitemcheckbox"
                  aria-checked={on}
                  onClick={() => onToggle(t)}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm outline-none transition hover:bg-primary/10 focus-visible:bg-primary/10"
                >
                  <span className={cn("grid size-4 place-items-center rounded border", on ? "border-primary bg-primary text-primary-foreground" : "border-border")}>
                    {on && <Check className="size-3" strokeWidth={3.5} />}
                  </span>
                  <span className="flex-1 truncate">#{t}</span>
                  <span className="text-xs text-muted-foreground">{counts.get(t)}</span>
                </button>
              );
            })}
          </div>
          {selected.length > 0 && (
            <button onClick={onClear} className="mt-1 w-full rounded-lg border-t border-border px-2.5 py-2 text-left text-xs text-muted-foreground hover:text-foreground">
              Clear tag filter
            </button>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function EmptyState({ filtering, onAdd, onReset }: { filtering: boolean; onAdd: () => void; onReset: () => void }) {
  const Icon = filtering ? SearchX : ClipboardList;
  return (
    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="surface flex flex-col items-center gap-3 px-6 py-14 text-center">
      <motion.div animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}>
        <Icon className="size-14 text-primary" />
      </motion.div>
      <h2 className="heading text-2xl">{filtering ? "Nothing matches" : "Nothing to do"}</h2>
      <p className="text-sm text-muted-foreground">
        {filtering ? "Try a different search or filter." : "Nothing on your list. Add something like \u201cBook dentist appointment\u201d to get started."}
      </p>
      <Button onClick={filtering ? onReset : onAdd}>
        {filtering ? <><X /> Reset filters</> : <><Sparkles /> Add your first todo</>}
      </Button>
    </motion.div>
  );
}

/**
 * Avoids skeleton flicker: nothing is shown for the first 300ms (fast loads never show it),
 * and once it appears it stays for at least 700ms so it doesn't flash away.
 */
function useSkeletonPhase(loading: boolean): "wait" | "skeleton" | "done" {
  const [phase, setPhase] = useState<"wait" | "skeleton" | "done">("wait");
  const shownAt = useRef(0);

  useEffect(() => {
    if (loading) {
      const t = setTimeout(() => {
        shownAt.current = Date.now();
        setPhase("skeleton");
      }, 300);
      return () => clearTimeout(t);
    }
    if (shownAt.current === 0) return setPhase("done");
    const t = setTimeout(() => setPhase("done"), Math.max(0, 700 - (Date.now() - shownAt.current)));
    return () => clearTimeout(t);
  }, [loading]);

  return phase;
}

function TodoSkeleton() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} className="space-y-3" aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="surface flex animate-soft-pulse items-center gap-3 p-4" style={{ animationDelay: `${i * 0.25}s` }}>
          <div className="size-7 shrink-0 rounded-full bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-4 rounded bg-muted" style={{ width: `${[58, 44, 66, 50][i]}%` }} />
            <div className="h-3 w-24 rounded-full bg-muted/70" />
          </div>
          <div className="size-9 rounded-xl bg-muted/70" />
        </div>
      ))}
    </motion.div>
  );
}
