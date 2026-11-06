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
  /** font / colour theme / radius chosen in Settings (validated by parseAppearance) */
  appearance?: unknown;
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

export interface ApiKeyDoc {
  id: string;
  userId: string;
  name: string;
  /** first characters of the key, shown in the UI so keys can be told apart ("tdn_ab12cd34") */
  prefix: string;
  /** sha256 of the full key; the key itself is never stored */
  hash: string;
  scopes: string[];
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  /** optional per-key daily request limit (never above the account limit) */
  dailyLimit: number | null;
}
/** One document per key per UTC day: how many requests it made. */
export interface ApiUsageDoc {
  id: string; // `${keyId}:${yyyy-mm-dd}`
  keyId: string;
  userId: string;
  day: string;
  count: number;
}

export interface Collection<T extends { id: string }> {
  find(q: Partial<T>): Promise<T[]>;
  findOne(q: Partial<T>): Promise<T | null>;
  insert(doc: T): Promise<void>;
  update(id: string, patch: Partial<T>): Promise<void>;
  remove(q: Partial<T>): Promise<number>;
  count(q: Partial<T>): Promise<number>;
  /** Atomically adds 1 to a numeric field of the document `id` (creating it from `init` if missing); returns the new value. */
  increment(id: string, init: T, field: keyof T & string): Promise<number>;
}
export interface DB {
  users: Collection<UserDoc>;
  todos: Collection<TodoDoc>;
  resets: Collection<ResetDoc>;
  apiKeys: Collection<ApiKeyDoc>;
  apiUsage: Collection<ApiUsageDoc>;
}

const matches = <T extends object>(doc: T, q: Partial<T>) =>
  (Object.keys(q) as (keyof T)[]).every((k) => doc[k] === q[k]);

/* ---------- JSON file store (local dev, no setup) ---------- */
const FILE = path.join(process.cwd(), "data", "db.json");
type Shape = { users: UserDoc[]; todos: TodoDoc[]; resets: ResetDoc[]; apiKeys: ApiKeyDoc[]; apiUsage: ApiUsageDoc[] };
let lock: Promise<unknown> = Promise.resolve();

async function readFile(): Promise<Shape> {
  try {
    const d = JSON.parse(await fs.readFile(FILE, "utf8"));
    return { apiKeys: [], apiUsage: [], ...d }; // files written before API keys existed
  } catch {
    return { users: [], todos: [], resets: [], apiKeys: [], apiUsage: [] };
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
    count: (q) => withLock((d) => arr(d).filter((x) => matches(x, q)).length, false),
    increment: (id, init, field) =>
      withLock((d) => {
        let doc = arr(d).find((x) => x.id === id) as unknown as Record<string, number> | undefined;
        if (!doc) {
          doc = { ...(init as unknown as Record<string, number>), [field]: 0 };
          arr(d).push(doc as unknown as T);
        }
        return (doc[field] = (doc[field] ?? 0) + 1);
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
  const t0 = performance.now();
  // Serverless-friendly settings. The important one is the short selection/connect timeout: the default is 30s,
  // which makes an unreachable database look like a page that "does nothing".
  const client = await new MongoClient(process.env.MONGO_URI!, {
    appName: "todo-next",
    maxPoolSize: 10,
    minPoolSize: 0,
    maxIdleTimeMS: 60_000,
    serverSelectionTimeoutMS: Number(process.env.MONGO_TIMEOUT_MS) || 6000,
    connectTimeoutMS: Number(process.env.MONGO_TIMEOUT_MS) || 6000,
    socketTimeoutMS: 20_000,
  }).connect();
  const db = client.db(process.env.MONGO_DB || "todo-next");
  noteConnect(Math.round(performance.now() - t0));

  const coll = <T extends { id: string }>(name: string): Collection<T> => {
    const c = db.collection(name);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const strip = (d: any) => (d ? (({ _id, ...rest }) => rest)(d) : null);
    const guard = async <R,>(fn: () => Promise<R>) => {
      try {
        return await fn();
      } catch (e) {
        throw asDuplicate(e);
      }
    };
    return {
      find: async (q) => (await c.find(q as object).toArray()).map(strip) as T[],
      findOne: async (q) => strip(await c.findOne(q as object)) as T | null,
      insert: (doc) => guard(async () => void (await c.insertOne({ ...doc }))),
      update: (id, patch) => guard(async () => void (await c.updateOne({ id }, { $set: patch as object }))),
      remove: async (q) => (await c.deleteMany(q as object)).deletedCount,
      count: (q) => c.countDocuments(q as object),
      increment: async (id, init, field) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { id: _id, [field]: _f, ...rest } = init as any;
        const run = () =>
          c.findOneAndUpdate({ id }, { $inc: { [field]: 1 }, $setOnInsert: rest }, { upsert: true, returnDocument: "after" });
        let doc;
        try {
          doc = await run();
        } catch (e) {
          // two requests created the same counter at once: the loser retries as a plain increment
          if ((e as { code?: number })?.code !== 11000) throw e;
          doc = await run();
        }
        return Number((doc as unknown as Record<string, unknown>)?.[field] ?? 1);
      },
    };
  };

  // Indexes are created in the background, once per instance. Awaiting them made every cold start wait
  // for several extra round trips to the database before it could answer the first request.
  void ensureIndexes(db).catch((e) => console.error("[db] index setup failed", e));

  return {
    users: coll<UserDoc>("users"),
    todos: coll<TodoDoc>("todos"),
    resets: coll<ResetDoc>("resets"),
    apiKeys: coll<ApiKeyDoc>("apiKeys"),
    apiUsage: coll<ApiUsageDoc>("apiUsage"),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function ensureIndexes(db: any) {
  await Promise.all([
    db.collection("users").createIndex({ email: 1 }, { unique: true }),
    db.collection("users").createIndex({ id: 1 }, { unique: true }),
    db.collection("users").createIndex({ googleId: 1 }, { unique: true, partialFilterExpression: { googleId: { $type: "string" } } }),
    db.collection("todos").createIndex({ userId: 1 }),
    db.collection("todos").createIndex({ id: 1 }, { unique: true }),
    db.collection("resets").createIndex({ tokenHash: 1 }),
    db.collection("resets").createIndex({ userId: 1 }),
    db.collection("apiKeys").createIndex({ hash: 1 }, { unique: true }),
    db.collection("apiKeys").createIndex({ userId: 1 }),
    db.collection("apiUsage").createIndex({ id: 1 }, { unique: true }),
    db.collection("apiUsage").createIndex({ userId: 1 }),
  ]);
}

/* ---------- timing: shows up in the host's logs so slow connections can be diagnosed ---------- */
const SLOW_MS = Number(process.env.DB_SLOW_MS) || 300;
export interface DbInfo { kind: "mongo" | "file"; connectMs: number | null; startedAt: number }
const g = globalThis as unknown as { __db?: Promise<DB>; __dbInfo?: DbInfo };

function noteConnect(ms: number) {
  g.__dbInfo = { kind: "mongo", connectMs: ms, startedAt: Date.now() };
  console.log(`[db] connected to MongoDB in ${ms}ms (new instance, region ${process.env.VERCEL_REGION ?? "local"})`);
}
export const dbInfo = (): DbInfo | undefined => g.__dbInfo;

function instrument<T extends { id: string }>(name: string, c: Collection<T>): Collection<T> {
  const wrap = <A extends unknown[], R>(op: string, fn: (...a: A) => Promise<R>) =>
    async (...a: A): Promise<R> => {
      const t = performance.now();
      try {
        return await fn(...a);
      } finally {
        const ms = performance.now() - t;
        if (ms > SLOW_MS) console.warn(`[db] slow ${name}.${op}: ${Math.round(ms)}ms`);
      }
    };
  return {
    find: wrap("find", c.find), findOne: wrap("findOne", c.findOne), insert: wrap("insert", c.insert), update: wrap("update", c.update),
    remove: wrap("remove", c.remove), count: wrap("count", c.count), increment: wrap("increment", c.increment),
  };
}

function build(): Promise<DB> {
  if (process.env.MONGO_URI) {
    return mongoDb().then((d) => ({
      users: instrument("users", d.users), todos: instrument("todos", d.todos), resets: instrument("resets", d.resets),
      apiKeys: instrument("apiKeys", d.apiKeys), apiUsage: instrument("apiUsage", d.apiUsage),
    }));
  }
  g.__dbInfo = { kind: "file", connectMs: null, startedAt: Date.now() };
  return Promise.resolve({
    users: fileCollection("users", ["email", "googleId"]),
    todos: fileCollection("todos"),
    resets: fileCollection("resets"),
    apiKeys: fileCollection("apiKeys", ["hash"]),
    apiUsage: fileCollection("apiUsage"),
  } as DB);
}

export function getDb(): Promise<DB> {
  if (!g.__db) {
    const p = build();
    g.__db = p;
    // never cache a failed connection: the next request must be able to try again
    p.catch((e) => {
      console.error("[db] connection failed:", (e as Error).message);
      if (g.__db === p) g.__db = undefined;
    });
  }
  return g.__db;
}
