"use client";
import { motion } from "framer-motion";
import { CalendarDays, Flag, Hash, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Priority, Todo } from "@/lib/types";
import Modal from "./Modal";

export type TodoDraft = Pick<Todo, "title" | "description" | "priority" | "dueDate" | "tags">;

const PRIORITIES: { id: Priority; label: string; active: string }[] = [
  { id: "low", label: "Low", active: "bg-emerald-500 text-white" },
  { id: "medium", label: "Medium", active: "bg-amber-500 text-white" },
  { id: "high", label: "High", active: "bg-rose-500 text-white" },
];

interface Props {
  open: boolean;
  todo?: Todo | null;
  allTags: string[];
  onClose: () => void;
  onSubmit: (draft: TodoDraft) => void;
}

export default function TodoForm({ open, todo, allTags, onClose, onSubmit }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [dueDate, setDueDate] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const titleRef = useRef<HTMLInputElement>(null);

  // Reset the form each time it opens.
  useEffect(() => {
    if (!open) return;
    setTitle(todo?.title ?? "");
    setDescription(todo?.description ?? "");
    setPriority(todo?.priority ?? "medium");
    setDueDate(todo?.dueDate ?? "");
    setTags(todo?.tags ?? []);
    setTagInput("");
    const t = setTimeout(() => titleRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, [open, todo]);

  const addTag = (raw: string) => {
    const t = raw.trim().toLowerCase().replace(/^#/, "");
    if (t && !tags.includes(t) && tags.length < 8) setTags([...tags, t]);
    setTagInput("");
  };

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!title.trim()) return titleRef.current?.focus();
    const finalTags = tagInput.trim() ? [...new Set([...tags, tagInput.trim().toLowerCase().replace(/^#/, "")])] : tags;
    onSubmit({ title: title.trim(), description: description.trim(), priority, dueDate: dueDate || null, tags: finalTags });
  };

  const suggestions = allTags.filter((t) => !tags.includes(t) && t.includes(tagInput.toLowerCase().replace(/^#/, ""))).slice(0, 6);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={todo ? "Edit Todo" : "New Todo"}
      footer={
        <>
          <button onClick={onClose} className="btn bg-slate-400 hover:bg-slate-500 dark:bg-slate-600">Cancel</button>
          <button onClick={() => submit()} className="btn bg-gradient-to-r from-sky-500 to-indigo-500">
            {todo ? "Update" : "Add Todo"}
          </button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <input
          ref={titleRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What needs doing?"
          maxLength={120}
          className="field font-supercell text-base tracking-wide"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add some details (optional)"
          rows={3}
          maxLength={2000}
          className="field resize-none"
        />

        <div>
          <p className="mb-1.5 flex items-center gap-1.5 font-supercell text-sm tracking-wide text-slate-500 dark:text-slate-400">
            <Flag className="size-4" /> Priority
          </p>
          <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-200/70 p-1 dark:bg-black/30">
            {PRIORITIES.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPriority(p.id)}
                className="relative rounded-lg py-1.5 font-supercell text-sm tracking-wide"
              >
                {priority === p.id && (
                  <motion.span layoutId="prio-pill" className={`absolute inset-0 rounded-lg ${p.active}`} transition={{ type: "spring", stiffness: 500, damping: 35 }} />
                )}
                <span className={`relative ${priority === p.id ? "text-white" : "text-slate-500 dark:text-slate-400"}`}>{p.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1.5 flex items-center gap-1.5 font-supercell text-sm tracking-wide text-slate-500 dark:text-slate-400">
            <CalendarDays className="size-4" /> Due date
          </p>
          <div className="flex gap-2">
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="field" />
            {dueDate && (
              <button type="button" onClick={() => setDueDate("")} aria-label="Clear due date" className="rounded-xl px-3 text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10">
                <X className="size-4" />
              </button>
            )}
          </div>
        </div>

        <div>
          <p className="mb-1.5 flex items-center gap-1.5 font-supercell text-sm tracking-wide text-slate-500 dark:text-slate-400">
            <Hash className="size-4" /> Tags
          </p>
          <div className="field flex flex-wrap items-center gap-1.5 !py-2">
            {tags.map((t) => (
              <span key={t} className="flex items-center gap-1 rounded-full bg-sky-500/15 px-2.5 py-0.5 text-xs text-sky-600 dark:text-sky-300">
                #{t}
                <button type="button" aria-label={`Remove ${t}`} onClick={() => setTags(tags.filter((x) => x !== t))}>
                  <X className="size-3" />
                </button>
              </span>
            ))}
            <input
              value={tagInput}
              onChange={(e) => (e.target.value.endsWith(",") ? addTag(e.target.value.slice(0, -1)) : setTagInput(e.target.value))}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  tagInput.trim() ? addTag(tagInput) : submit();
                } else if (e.key === "Backspace" && !tagInput) setTags(tags.slice(0, -1));
              }}
              placeholder={tags.length ? "" : "work, home, urgent…"}
              className="min-w-24 flex-1 bg-transparent text-sm outline-none"
            />
          </div>
          {tagInput && suggestions.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {suggestions.map((s) => (
                <button key={s} type="button" onClick={() => addTag(s)} className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs hover:bg-sky-500/20 dark:bg-white/10">
                  #{s}
                </button>
              ))}
            </div>
          )}
        </div>
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}
