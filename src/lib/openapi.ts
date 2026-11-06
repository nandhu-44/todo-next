import { limits } from "./limits";

type Param = { name: string; in: "query" | "path"; description: string; required?: boolean; schema: Record<string, unknown> };
export interface Endpoint { method: "get" | "post" | "patch" | "delete"; path: string; summary: string; scope: string; params?: Param[]; body?: string; responses: Record<string, string> }

const q = (name: string, description: string, schema: Record<string, unknown> = { type: "string" }): Param => ({ name, in: "query", description, schema });
const id: Param = { name: "id", in: "path", description: "The todo's id", required: true, schema: { type: "string", format: "uuid" } };

export const ENDPOINTS: Endpoint[] = [
  { method: "get", path: "/api/v1/todos", summary: "List todos (filter, sort, page)", scope: "todos:read",
    params: [
      q("completed", "true or false", { type: "boolean" }), q("priority", "low, medium or high", { enum: ["low", "medium", "high"] }),
      q("tag", "Only todos with this tag"), q("q", "Search title and description"),
      q("due_before", "Due on or before YYYY-MM-DD"), q("due_after", "Due on or after YYYY-MM-DD"), q("overdue", "true: only overdue and unfinished", { type: "boolean" }),
      q("sort", "order, created, updated, due, priority or title", { type: "string", default: "order" }), q("direction", "asc or desc", { enum: ["asc", "desc"] }),
      q("limit", "1 to 200 (default 50)", { type: "integer" }), q("offset", "How many to skip", { type: "integer" }),
    ],
    responses: { "200": "{ data: Todo[], total, limit, offset }" } },
  { method: "post", path: "/api/v1/todos", summary: "Create a todo", scope: "todos:write", body: '{ "title": "Renew car insurance", "priority": "high", "dueDate": "2026-12-15", "tags": ["errands"] }', responses: { "201": "{ data: Todo }", "403": "todo_limit_reached" } },
  { method: "get", path: "/api/v1/todos/{id}", summary: "Get one todo", scope: "todos:read", params: [id], responses: { "200": "{ data: Todo }", "404": "not_found" } },
  { method: "patch", path: "/api/v1/todos/{id}", summary: "Change a todo (send only what changes)", scope: "todos:write", params: [id], body: '{ "completed": true }', responses: { "200": "{ data: Todo }", "404": "not_found" } },
  { method: "delete", path: "/api/v1/todos/{id}", summary: "Delete a todo", scope: "todos:write", params: [id], responses: { "204": "no content", "404": "not_found" } },
  { method: "post", path: "/api/v1/todos/clear-completed", summary: "Delete all completed todos", scope: "todos:write", responses: { "200": "{ removed: number }" } },
  { method: "get", path: "/api/v1/me", summary: "The account, this key and your limits", scope: "any valid key", responses: { "200": "{ user, key, todos, limits }" } },
  { method: "get", path: "/api/v1/usage", summary: "Today's quota usage and the last 7 days", scope: "any valid key", responses: { "200": "{ today, last7Days }" } },
];

export function openApiSpec(origin: string) {
  const l = limits();
  const todo = {
    type: "object",
    properties: {
      id: { type: "string", format: "uuid" }, title: { type: "string", maxLength: 120 }, description: { type: "string", maxLength: 2000 }, completed: { type: "boolean" },
      priority: { enum: ["low", "medium", "high"] }, dueDate: { type: ["string", "null"], format: "date" }, tags: { type: "array", items: { type: "string" }, maxItems: 8 },
      order: { type: "number" }, createdAt: { type: "string", format: "date-time" }, updatedAt: { type: "string", format: "date-time" }, completedAt: { type: ["string", "null"], format: "date-time" },
    },
  };
  const paths: Record<string, Record<string, unknown>> = {};
  for (const e of ENDPOINTS) {
    (paths[e.path] ??= {})[e.method] = {
      summary: e.summary,
      description: `Required scope: ${e.scope}.`,
      parameters: e.params,
      ...(e.body ? { requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/TodoInput" }, example: JSON.parse(e.body) } } } } : {}),
      responses: Object.fromEntries(Object.entries(e.responses).map(([code, description]) => [code, { description }])),
    };
  }
  return {
    openapi: "3.1.0",
    info: {
      title: "ToDo Next API", version: "1.0.0",
      description: `Create an API key in Settings, then send it as \`Authorization: Bearer <key>\`. Limits per key: ${l.perMinute} requests/minute and ${l.perDay} requests/day (UTC).`,
    },
    servers: [{ url: origin }],
    security: [{ bearerAuth: [] }],
    paths,
    components: {
      securitySchemes: { bearerAuth: { type: "http", scheme: "bearer", description: "API key starting with sk_tdn." } },
      schemas: {
        Todo: todo,
        TodoInput: { type: "object", properties: { title: todo.properties.title, description: todo.properties.description, completed: todo.properties.completed, priority: todo.properties.priority, dueDate: todo.properties.dueDate, tags: todo.properties.tags } },
        Error: { type: "object", properties: { error: { type: "object", properties: { code: { type: "string" }, message: { type: "string" } } } } },
      },
    },
  };
}
