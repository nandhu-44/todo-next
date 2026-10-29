"use client";
import { AnimatePresence, Reorder, motion } from "framer-motion";
import { ArrowDownUp, ChevronDown, ClipboardList, Eraser, LogOut, Plus, Search, SearchX, Settings, Sparkles, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";
import { notify } from "@/lib/notify";
import { daysUntil } from "@/lib/dates";
import type { PublicUser, Todo } from "@/lib/types";
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
      notify.error((e as Error).message);
    }
  }, []);

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
        notify.success("Todo updated");
      } catch (e) {
        notify.error((e as Error).message);
        reload();
      }
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
    const completed = !t.completed;
    const stamp = completed ? new Date().toISOString() : null;
    setTodos((l) => l.map((x) => (x.id === t.id ? { ...x, completed, completedAt: stamp } : x)));
    try {
      await api(`/api/todos/${t.id}`, { method: "PATCH", body: { completed } });
    } catch (e) {
      notify.error((e as Error).message);
      reload();
    }
  }

  async function remove(t: Todo) {
    setDeleting(null);
    setTodos((l) => l.filter((x) => x.id !== t.id));
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
    setClearOpen(false);
    const gone = todos.filter((t) => t.completed);
    setTodos((l) => l.filter((t) => !t.completed));
    try {
      await api("/api/todos/clear-completed", { method: "POST" });
      notify.success(`Cleared ${gone.length} completed ${gone.length === 1 ? "todo" : "todos"}`, {
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

  async function reorder(next: Todo[]) {
    setTodos(next);
  }
  async function persistOrder() {
    try {
      await api("/api/todos/reorder", { method: "POST", body: { ids: todos.map((t) => t.id) } });
    } catch (e) {
      notify.error((e as Error).message);
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
            <AnimatePresence>
              {tag && (
                <motion.button initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} onClick={() => setTag(null)} className="flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-xs text-primary-foreground">
                  #{tag} <X className="size-3" />
                </motion.button>
              )}
            </AnimatePresence>
            {!tag && allTags.slice(0, 6).map((t) => (
              <button key={t} onClick={() => setTag(t)} className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground transition hover:bg-primary/15 hover:text-primary">
                #{t}
              </button>
            ))}
          </div>
        </div>

        {/* list */}
        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="relative h-[76px] overflow-hidden rounded-2xl bg-muted/60">
                <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-foreground/10 to-transparent" />
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
              <p className="pt-1 text-center text-xs text-muted-foreground">Drag the handle to reorder</p>
            )}
          </>
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
