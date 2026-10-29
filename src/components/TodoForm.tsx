"use client";
import { Flag, Hash, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Priority, Todo } from "@/lib/types";
import { Button } from "./ui/button";
import { DatePicker } from "./ui/date-picker";
import { Dialog, DialogContent } from "./ui/dialog";
import { Input, Textarea } from "./ui/input";
import { Label } from "./ui/label";
import { SegmentedControl } from "./ui/toggle-group";

export type TodoDraft = Pick<Todo, "title" | "description" | "priority" | "dueDate" | "tags">;

const PRIORITIES = [
  { value: "low" as Priority, label: "Low", activeClass: "bg-prio-low" },
  { value: "medium" as Priority, label: "Medium", activeClass: "bg-prio-medium" },
  { value: "high" as Priority, label: "High", activeClass: "bg-prio-high" },
];

interface Props {
  open: boolean;
  todo?: Todo | null;
  allTags: string[];
  onClose: () => void;
  onSubmit: (draft: TodoDraft) => void;
}

const cleanTag = (t: string) => t.trim().toLowerCase().replace(/^#/, "");

export default function TodoForm({ open, todo, allTags, onClose, onSubmit }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [dueDate, setDueDate] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [titleError, setTitleError] = useState(false);
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
    setTitleError(false);
  }, [open, todo]);

  const addTag = (raw: string) => {
    const t = cleanTag(raw);
    if (t && !tags.includes(t) && tags.length < 8) setTags([...tags, t]);
    setTagInput("");
  };

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!title.trim()) {
      setTitleError(true);
      return titleRef.current?.focus();
    }
    const pending = cleanTag(tagInput);
    onSubmit({
      title: title.trim(),
      description: description.trim(),
      priority,
      dueDate: dueDate || null,
      tags: pending && !tags.includes(pending) ? [...tags, pending].slice(0, 8) : tags,
    });
  };

  const suggestions = tagInput ? allTags.filter((t) => !tags.includes(t) && t.includes(cleanTag(tagInput))).slice(0, 6) : [];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        title={todo ? "Edit todo" : "New todo"}
        description="Todo details"
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          titleRef.current?.focus();
        }}
        footer={
          <>
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button onClick={() => submit()}>{todo ? "Save changes" : "Add todo"}</Button>
          </>
        }
      >
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="todo-title">Title</Label>
            <Input
              ref={titleRef}
              id="todo-title"
              value={title}
              onChange={(e) => { setTitle(e.target.value); setTitleError(false); }}
              placeholder="Renew car insurance"
              maxLength={120}
              aria-invalid={titleError}
              className={titleError ? "border-destructive ring-4 ring-destructive/20" : undefined}
            />
            {titleError && <p className="text-xs text-destructive">Give your todo a title.</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="todo-desc">Notes</Label>
            <Textarea
              id="todo-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Compare quotes from two providers before the 15th"
              rows={3}
              maxLength={2000}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5"><Flag className="size-4" /> Priority</Label>
            <SegmentedControl label="Priority" value={priority} onChange={setPriority} options={PRIORITIES} className="w-full [&>*]:flex-1" />
          </div>

          <div className="space-y-1.5">
            <Label>Due date</Label>
            <DatePicker value={dueDate} onChange={setDueDate} />
          </div>

          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5"><Hash className="size-4" /> Tags</Label>
            <div className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-xl border border-border bg-background/60 px-3 py-1.5 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/20">
              {tags.map((t) => (
                <span key={t} className="flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-0.5 text-xs text-primary">
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
                placeholder={tags.length ? "" : "work, errands, health"}
                aria-label="Add a tag"
                className="min-w-24 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/70"
              />
            </div>
            {suggestions.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {suggestions.map((s) => (
                  <button key={s} type="button" onClick={() => addTag(s)} className="rounded-full bg-muted px-2.5 py-0.5 text-xs hover:bg-primary/15">
                    #{s}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button type="submit" hidden />
        </form>
      </DialogContent>
    </Dialog>
  );
}
