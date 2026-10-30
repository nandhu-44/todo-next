import { promises as fs } from "fs";
import path from "path";
import type { Todo } from "./types";

export interface UserDoc {
  id: string;
  name: string;
  email: string;
  /** null for accounts created through Google that never set a password */
  passwordHash: string | null;
  googleId?: string | null;
  /** AES-GCM encrypted base32 secret of an enabled authenticator */
  totpSecret?: string | null;
  totpEnabled?: boolean;
  /** secret generated during setup but not yet confirmed */
  totpPending?: string | null;
  /** last accepted time step, to reject replayed codes */
  totpLastStep?: number;
  /** sha256 hashes of unused recovery codes */
  recoveryCodes?: string[];
  createdAt: string;
}
export type TodoDoc = Todo & { userId: string };
export interface ResetDoc {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: number;
}

/** Thrown when an insert/update would break a unique field (e.g. a second account with the same email). */
export class DuplicateError extends Error {
  constructor(public field: string) {
    super(`Duplicate ${field}`);
  }
}

export interface Collection<T extends { id: string }> {
  find(q: Partial<T>): Promise<T[]>;
  findOne(q: Partial<T>): Promise<T | null>;
  insert(doc: T): Promise<void>;
  update(id: string, patch: Partial<T>): Promise<void>;
  remove(q: Partial<T>): Promise<number>;
}
export interface DB {
  users: Collection<UserDoc>;
  todos: Collection<TodoDoc>;
  resets: Collection<ResetDoc>;
}

const matches = <T extends object>(doc: T, q: Partial<T>) =>
  (Object.keys(q) as (keyof T)[]).every((k) => doc[k] === q[k]);

/* ---------- JSON file store (local dev, no setup) ---------- */
const FILE = path.join(process.cwd(), "data", "db.json");
type Shape = { users: UserDoc[]; todos: TodoDoc[]; resets: ResetDoc[] };
let lock: Promise<unknown> = Promise.resolve();

async function readFile(): Promise<Shape> {
  try {
    return JSON.parse(await fs.readFile(FILE, "utf8"));
  } catch {
    return { users: [], todos: [], resets: [] };
  }
}
// Serialise every read-modify-write so concurrent requests can't clobber each other.
function withLock<R>(fn: (data: Shape) => Promise<R> | R, write: boolean): Promise<R> {
  const run = lock.then(async () => {
    const data = await readFile();
    const result = await fn(data);
    if (write) {
      await fs.mkdir(path.dirname(FILE), { recursive: true });
      const tmp = FILE + ".tmp";
      await fs.writeFile(tmp, JSON.stringify(data, null, 2));
      await fs.rename(tmp, FILE);
    }
    return result;
  });
  lock = run.catch(() => undefined);
  return run;
}

function fileCollection<K extends keyof Shape>(name: K, unique: string[] = []): Collection<Shape[K][number]> {
  type T = Shape[K][number];
  const arr = (d: Shape) => d[name] as unknown as T[];
  // Unset values (null/undefined) never collide, like a partial unique index.
  const checkUnique = (d: Shape, doc: T, ignoreId?: string) => {
    for (const f of unique) {
      const v = (doc as unknown as Record<string, unknown>)[f];
      if (v == null) continue;
      if (arr(d).some((x) => x.id !== ignoreId && (x as unknown as Record<string, unknown>)[f] === v)) throw new DuplicateError(f);
    }
  };
  return {
    find: (q) => withLock((d) => arr(d).filter((x) => matches(x, q)), false),
    findOne: (q) => withLock((d) => arr(d).find((x) => matches(x, q)) ?? null, false),
    insert: (doc) =>
      withLock((d) => {
        checkUnique(d, doc);
        arr(d).push(doc);
      }, true),
    update: (id, patch) =>
      withLock((d) => {
        const i = arr(d).findIndex((x) => x.id === id);
        if (i < 0) return;
        const next = { ...arr(d)[i], ...patch };
        checkUnique(d, next, id);
        arr(d)[i] = next;
      }, true),
    remove: (q) =>
      withLock((d) => {
        const before = arr(d).length;
        (d[name] as unknown as T[]) = arr(d).filter((x) => !matches(x, q));
        return before - arr(d).length;
      }, true),
  };
}

/* ---------- MongoDB store ---------- */
function asDuplicate(e: unknown) {
  const err = e as { code?: number; keyPattern?: Record<string, unknown> };
  return err?.code === 11000 ? new DuplicateError(Object.keys(err.keyPattern ?? { email: 1 })[0]) : e;
}
async function mongoDb(): Promise<DB> {
  const { MongoClient } = await import("mongodb");
  const client = await new MongoClient(process.env.MONGO_URI!).connect();
  const db = client.db(process.env.MONGO_DB || "todo-next");
  const coll = <T extends { id: string }>(name: string): Collection<T> => {
    const c = db.collection(name);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const strip = (d: any) => (d ? (({ _id, ...rest }) => rest)(d) : null);
    return {
      find: async (q) => (await c.find(q as object).toArray()).map(strip) as T[],
      findOne: async (q) => strip(await c.findOne(q as object)) as T | null,
      insert: async (doc) => {
        try {
          await c.insertOne({ ...doc });
        } catch (e) {
          throw asDuplicate(e);
        }
      },
      update: async (id, patch) => {
        try {
          await c.updateOne({ id }, { $set: patch as object });
        } catch (e) {
          throw asDuplicate(e);
        }
      },
      remove: async (q) => (await c.deleteMany(q as object)).deletedCount,
    };
  };
  const users = coll<UserDoc>("users");
  const todos = coll<TodoDoc>("todos");
  await Promise.all([
    db.collection("users").createIndex({ email: 1 }, { unique: true }),
    db.collection("users").createIndex({ id: 1 }, { unique: true }),
    db.collection("users").createIndex({ googleId: 1 }, { unique: true, partialFilterExpression: { googleId: { $type: "string" } } }),
    db.collection("todos").createIndex({ userId: 1 }),
    db.collection("todos").createIndex({ id: 1 }),
  ]);
  return { users, todos, resets: coll<ResetDoc>("resets") };
}

const g = globalThis as unknown as { __db?: Promise<DB> };
export function getDb(): Promise<DB> {
  if (!g.__db) {
    g.__db = process.env.MONGO_URI
      ? mongoDb()
      : Promise.resolve({
          users: fileCollection("users", ["email", "googleId"]),
          todos: fileCollection("todos"),
          resets: fileCollection("resets"),
        } as DB);
  }
  return g.__db;
}
