"use client";
import { AnimatePresence, Reorder, motion, useDragControls } from "framer-motion";
import { AlarmClock, ChevronDown, GripVertical, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { dueLabel, fullDate } from "@/lib/dates";
import type { Todo } from "@/lib/types";
import { Button } from "./ui/button";
import { RoundCheckbox } from "./ui/checkbox";
import { Tip } from "./ui/tooltip";

const PRIORITY_DOT = { low: "bg-emerald-300", medium: "bg-amber-300", high: "bg-rose-300" };
const DUE_TONE = {
  overdue: "bg-rose-500/90 text-white",
  soon: "bg-amber-400 text-amber-950",
  later: "bg-white/20 text-white",
};

interface Props {
  todo: Todo;
  canDrag: boolean;
  onDragEnd: () => void;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onTag: (tag: string) => void;
}

export default function TodoItem({ todo, canDrag, onDragEnd, onToggle, onEdit, onDelete, onTag }: Props) {
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
      layout="position"
      initial={{ opacity: 0, y: -16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 60, scale: 0.9, transition: { duration: 0.2 } }}
      whileDrag={{ scale: 1.03, boxShadow: "0 18px 40px rgba(0,0,0,.35)", zIndex: 20 }}
      transition={{ type: "spring", stiffness: 420, damping: 32 }}
      className={`relative list-none overflow-hidden rounded-2xl text-white shadow-lg transition-colors duration-500 ${
        todo.completed
          ? "bg-gradient-to-r from-emerald-500 to-green-500 shadow-emerald-500/20"
          : "bg-gradient-to-r from-sky-500 to-blue-500 shadow-sky-500/20"
      }`}
    >
      <span className={`absolute inset-y-0 left-0 w-1.5 ${PRIORITY_DOT[todo.priority]}`} title={`${todo.priority} priority`} />
      <div className="flex items-center gap-1 py-3 pl-4 pr-3 sm:gap-2 sm:py-4 sm:pl-5">
        {canDrag && (
          <button
            aria-label="Drag to reorder"
            onPointerDown={(e) => controls.start(e)}
            className="-ml-1 cursor-grab touch-none rounded-lg p-1 text-white/60 hover:text-white active:cursor-grabbing"
          >
            <GripVertical className="size-5" />
          </button>
        )}

        {/* completion checkbox with burst */}
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

        <div onClick={() => hasMore && setOpen((o) => !o)} className={`min-w-0 flex-1 px-1 text-left sm:px-2 ${hasMore ? "cursor-pointer" : "cursor-default"}`}>
          <h3 className={`relative inline-block max-w-full break-words font-supercell text-base tracking-wide sm:text-xl ${todo.completed ? "opacity-80" : ""}`}>
            {todo.title}
            <motion.span
              className="absolute left-0 top-1/2 h-0.5 rounded bg-white"
              initial={false}
              animate={{ width: todo.completed ? "100%" : "0%" }}
              transition={{ duration: 0.3 }}
            />
          </h3>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {due && (
              <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${DUE_TONE[tone]}`}>
                <AlarmClock className="size-3" /> {due.text}
              </span>
            )}
            {todo.tags.map((t) => (
              <span
                key={t}
                role="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onTag(t);
                }}
                className="rounded-full bg-white/20 px-2 py-0.5 text-[11px] hover:bg-white/30"
              >
                #{t}
              </span>
            ))}
            {hasMore && (
              <motion.span animate={{ rotate: open ? 180 : 0 }} className="text-white/70">
                <ChevronDown className="size-4" />
              </motion.span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <Tip label="Edit">
            <Button variant="warning" size="icon-sm" onClick={onEdit} aria-label={`Edit "${todo.title}"`} className="shadow">
              <Pencil className="!size-4" />
            </Button>
          </Tip>
          <Tip label="Delete">
            <Button variant="destructive" size="icon-sm" onClick={onDelete} aria-label={`Delete "${todo.title}"`} className="shadow">
              <Trash2 className="!size-4" />
            </Button>
          </Tip>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="space-y-2 border-t border-white/20 bg-black/10 px-5 py-3 text-sm">
              {todo.description && <p className="whitespace-pre-wrap break-words">{todo.description}</p>}
              <p className="text-xs italic text-white/70">
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

/** Little particle burst shown when a todo is completed. */
function Burst() {
  const colors = ["bg-yellow-300", "bg-white", "bg-pink-300", "bg-sky-200"];
  return (
    <span className="pointer-events-none absolute left-1/2 top-1/2">
      {Array.from({ length: 10 }, (_, i) => {
        const angle = (i / 10) * Math.PI * 2;
        return (
          <motion.span
            key={i}
            className={`absolute size-1.5 rounded-full ${colors[i % colors.length]}`}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{ x: Math.cos(angle) * 30, y: Math.sin(angle) * 30, opacity: 0, scale: 0.3 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        );
      })}
    </span>
  );
}
