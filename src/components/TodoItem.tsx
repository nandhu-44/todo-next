"use client";
import { AnimatePresence, Reorder, motion, useDragControls } from "framer-motion";
import { AlarmClock, ChevronDown, GripVertical, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { dueLabel, fullDate } from "@/lib/dates";
import type { Todo } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { RoundCheckbox } from "./ui/checkbox";
import { Tip } from "./ui/tooltip";

const PRIORITY_BAR = { low: "bg-prio-low", medium: "bg-prio-medium", high: "bg-prio-high" };
const DUE_TONE = {
  overdue: "bg-destructive/12 text-destructive",
  soon: "bg-primary/15 text-primary",
  later: "bg-muted text-muted-foreground",
};

interface Props {
  todo: Todo;
  canDrag: boolean;
  onDragEnd: () => void;
  /** the list container: an item cannot be dragged outside it */
  constraintsRef: React.RefObject<HTMLElement | null>;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onTag: (tag: string) => void;
}

export default function TodoItem({ todo, canDrag, onDragEnd, constraintsRef, onToggle, onEdit, onDelete, onTag }: Props) {
  const controls = useDragControls();
  const [open, setOpen] = useState(false);
  const [burst, setBurst] = useState(0);
  const due = todo.dueDate ? dueLabel(todo.dueDate) : null;
  const tone = due && !todo.completed ? due.tone : "later";
  const hasMore = !!todo.description || !!todo.completedAt;

  return (
    <Reorder.Item
      value={todo}
      id={todo.id}
      dragListener={false}
      dragControls={controls}
      onDragEnd={onDragEnd}
      dragConstraints={constraintsRef}
      dragElastic={0}
      dragMomentum={false}
      layout="position"
      initial={{ opacity: 0, y: -12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 40, scale: 0.95, transition: { duration: 0.18 } }}
      whileDrag={{ boxShadow: "0 18px 40px hsl(0 0% 0% / .25)", zIndex: 20 }}
      transition={{ type: "spring", stiffness: 420, damping: 32 }}
      className="surface relative list-none overflow-hidden"
    >
      <span className={cn("absolute inset-y-0 left-0 w-1", PRIORITY_BAR[todo.priority])} title={`${todo.priority} priority`} />
      <div className="flex items-center gap-1 py-3 pl-3 pr-2.5 sm:gap-2 sm:py-3.5 sm:pl-4">
        {canDrag && (
          <button
            aria-label="Drag to reorder"
            onPointerDown={(e) => controls.start(e)}
            className="cursor-grab touch-none rounded-lg p-1 text-muted-foreground/60 hover:text-foreground active:cursor-grabbing"
          >
            <GripVertical className="size-5" />
          </button>
        )}

        <div className="relative">
          <RoundCheckbox
            checked={todo.completed}
            label={`Mark "${todo.title}" as ${todo.completed ? "not done" : "done"}`}
            onCheckedChange={(c) => {
              if (c) setBurst((b) => b + 1);
              onToggle();
            }}
          />
          {burst > 0 && <Burst key={burst} />}
        </div>

        <div onClick={() => hasMore && setOpen((o) => !o)} className={cn("min-w-0 flex-1 px-1 text-left sm:px-2", hasMore && "cursor-pointer")}>
          <h3 className={cn("heading relative inline-block max-w-full break-words text-base transition-colors sm:text-lg", todo.completed && "text-muted-foreground")}>
            {todo.title}
            <motion.span
              className="absolute left-0 top-1/2 h-0.5 rounded bg-muted-foreground"
              initial={false}
              animate={{ width: todo.completed ? "100%" : "0%" }}
              transition={{ duration: 0.3 }}
            />
          </h3>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {due && (
              <span className={cn("flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium", DUE_TONE[tone])}>
                <AlarmClock className="size-3" /> {due.text}
              </span>
            )}
            {todo.tags.map((t) => (
              <button
                key={t}
                onClick={(e) => {
                  e.stopPropagation();
                  onTag(t);
                }}
                className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground transition hover:bg-primary/15 hover:text-primary"
              >
                #{t}
              </button>
            ))}
            {hasMore && (
              <motion.span animate={{ rotate: open ? 180 : 0 }} className="text-muted-foreground">
                <ChevronDown className="size-4" />
              </motion.span>
            )}
          </div>
        </div>

        <div className="flex items-center">
          <Tip label="Edit">
            <Button variant="ghost" size="icon-sm" onClick={onEdit} aria-label={`Edit "${todo.title}"`}>
              <Pencil className="!size-4" />
            </Button>
          </Tip>
          <Tip label="Delete">
            <Button variant="ghost" size="icon-sm" onClick={onDelete} aria-label={`Delete "${todo.title}"`} className="hover:bg-destructive/12 hover:text-destructive">
              <Trash2 className="!size-4" />
            </Button>
          </Tip>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="space-y-2 border-t border-border bg-muted/40 px-5 py-3 text-sm">
              {todo.description && <p className="whitespace-pre-wrap break-words">{todo.description}</p>}
              <p className="text-xs text-muted-foreground">
                Created {fullDate(todo.createdAt)}
                {todo.completedAt && ` · Completed ${fullDate(todo.completedAt)}`}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Reorder.Item>
  );
}

/** Particle burst shown when a todo is completed. */
function Burst() {
  const colors = ["bg-primary", "bg-prio-medium", "bg-prio-high", "bg-prio-low"];
  return (
    <span className="pointer-events-none absolute left-1/2 top-1/2">
      {Array.from({ length: 10 }, (_, i) => {
        const angle = (i / 10) * Math.PI * 2;
        return (
          <motion.span
            key={i}
            className={cn("absolute size-1.5 rounded-full", colors[i % colors.length])}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{ x: Math.cos(angle) * 30, y: Math.sin(angle) * 30, opacity: 0, scale: 0.3 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        );
      })}
    </span>
  );
}
