import type { Priority } from "./types";

export interface TodoPatch {
  title?: string;
  description?: string;
  completed?: boolean;
  priority?: Priority;
  dueDate?: string | null;
  tags?: string[];
}

const PRIORITIES = ["low", "medium", "high"];

/** Validates an untrusted body; returns a clean patch or an error string. */
export function parseTodo(body: unknown, requireTitle: boolean): TodoPatch | string {
  if (!body || typeof body !== "object") return "Invalid body";
  const b = body as Record<string, unknown>;
  const out: TodoPatch = {};

  if (b.title !== undefined || requireTitle) {
    if (typeof b.title !== "string" || !b.title.trim()) return "Title is required";
    if (b.title.trim().length > 120) return "Title is too long (max 120)";
    out.title = b.title.trim();
  }
  if (b.description !== undefined) {
    if (typeof b.description !== "string") return "Invalid description";
    if (b.description.length > 2000) return "Description is too long (max 2000)";
    out.description = b.description.trim();
  }
  if (b.completed !== undefined) {
    if (typeof b.completed !== "boolean") return "Invalid completed flag";
    out.completed = b.completed;
  }
  if (b.priority !== undefined) {
    if (typeof b.priority !== "string" || !PRIORITIES.includes(b.priority)) return "Invalid priority";
    out.priority = b.priority as Priority;
  }
  if (b.dueDate !== undefined) {
    if (b.dueDate !== null && (typeof b.dueDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(b.dueDate)))
      return "Invalid due date";
    out.dueDate = (b.dueDate as string | null) || null;
  }
  if (b.tags !== undefined) {
    if (!Array.isArray(b.tags) || b.tags.some((t) => typeof t !== "string")) return "Invalid tags";
    out.tags = [...new Set((b.tags as string[]).map((t) => t.trim().toLowerCase()).filter(Boolean))]
      .map((t) => t.slice(0, 24))
      .slice(0, 8);
  }
  return out;
}

export const toTodo = ({ userId: _userId, ...todo }: import("./db").TodoDoc): import("./types").Todo => todo;
