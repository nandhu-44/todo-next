import { merge, countPending } from "../src/lib/sync.ts";
import assert from "node:assert/strict";
const T = (id: string, o: any = {}) => ({ id, title: id, description: "", completed: false, priority: "medium", dueDate: null, tags: [], order: 0, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z", completedAt: null, ...o });
const now = "2026-06-01T00:00:00.000Z";
const ids = (r: any) => r.merged.map((t: any) => t.id).join();
let n = 0; const ok = (name: string, fn: () => void) => { fn(); console.log("✓", name); n++; };

const base = [T("a", { order: 0 }), T("b", { order: 1 }), T("c", { order: 2 })];

ok("no changes anywhere -> nothing to do", () => {
  const r = merge(base, base, base, now);
  assert.equal(r.toInsert.length + r.toUpdate.length + r.toDelete.length, 0);
  assert.deepEqual(r.stats, { pushed: 0, pulled: 0, conflicts: 0 });
});
ok("local-only edit is pushed", () => {
  const local = [T("a", { title: "A!", updatedAt: "2026-02-01T00:00:00.000Z" }), base[1], base[2]];
  const r = merge(base, local, base, now);
  assert.equal(r.toUpdate.length, 1); assert.equal(r.toUpdate[0].title, "A!"); assert.equal(r.stats.pushed, 1);
});
ok("edits to DIFFERENT todos on two devices both survive", () => {
  const local = [T("a", { title: "A-local", updatedAt: "2026-02-01T00:00:00.000Z" }), base[1], base[2]];
  const server = [base[0], T("b", { title: "B-server", updatedAt: "2026-02-02T00:00:00.000Z" }), base[2]];
  const r = merge(base, local, server, now);
  const m = Object.fromEntries(r.merged.map((t: any) => [t.id, t.title]));
  assert.deepEqual(m, { a: "A-local", b: "B-server", c: "c" }); assert.equal(r.stats.conflicts, 0);
});
ok("same todo edited on both: newest edit wins, counted as conflict", () => {
  const local = [T("a", { title: "local", updatedAt: "2026-03-01T00:00:00.000Z" }), base[1], base[2]];
  const server = [T("a", { title: "server", updatedAt: "2026-02-01T00:00:00.000Z" }), base[1], base[2]];
  let r = merge(base, local, server, now); assert.equal(r.merged[0].title, "local"); assert.equal(r.stats.conflicts, 1);
  const server2 = [T("a", { title: "server", updatedAt: "2026-04-01T00:00:00.000Z" }), base[1], base[2]];
  r = merge(base, local, server2, now); assert.equal(r.merged[0].title, "server"); assert.equal(r.toUpdate.length, 0);
});
ok("future-dated device clock is clamped to server time", () => {
  const local = [T("a", { title: "local", updatedAt: "2099-01-01T00:00:00.000Z" }), base[1], base[2]];
  const r = merge(base, local, base, now); assert.equal(r.merged[0].updatedAt, now);
});
ok("deleted on server, untouched locally -> dropped locally", () => {
  const server = [base[0], base[2]];
  const r = merge(base, base, server, now); assert.equal(ids(r), "a,c"); assert.equal(r.toDelete.length, 0);
});
ok("deleted on server, EDITED locally -> edit survives (re-created)", () => {
  const local = [base[0], T("b", { title: "edited", updatedAt: "2026-02-01T00:00:00.000Z" }), base[2]];
  const r = merge(base, local, [base[0], base[2]], now); assert.equal(ids(r), "a,b,c"); assert.equal(r.toInsert[0].id, "b"); assert.equal(r.stats.conflicts, 1);
});
ok("deleted locally, untouched on server -> deleted on server", () => {
  const r = merge(base, [base[0], base[2]], base, now); assert.deepEqual(r.toDelete, ["b"]); assert.equal(ids(r), "a,c");
});
ok("deleted locally, EDITED on server -> server's edit survives", () => {
  const server = [base[0], T("b", { title: "srv", updatedAt: "2026-02-01T00:00:00.000Z" }), base[2]];
  const r = merge(base, [base[0], base[2]], server, now); assert.equal(ids(r), "a,b,c"); assert.equal(r.toDelete.length, 0);
});
ok("deleted on both -> stays deleted", () => {
  const r = merge(base, [base[0]], [base[0]], now); assert.equal(ids(r), "a");
});
ok("new todos on both devices are both kept", () => {
  const local = [T("n1", { order: -1 }), ...base]; const server = [T("n2", { order: -1 }), ...base];
  const r = merge(base, local, server, now); assert.equal(r.merged.length, 5); assert.equal(r.toInsert.map((t: any) => t.id).join(), "n1");
  assert.deepEqual(r.merged.map((t: any) => t.order), [0, 1, 2, 3, 4]);
});
ok("local reorder wins; server-only new todo goes on top", () => {
  const local = [T("c", { order: 0 }), T("a", { order: 1 }), T("b", { order: 2 })];
  const server = [T("z", { order: -1 }), ...base];
  const r = merge(base, local, server, now); assert.equal(ids(r), "z,c,a,b");
});
ok("server reorder is kept when this device did not reorder", () => {
  const server = [T("c", { order: 0 }), T("a", { order: 1 }), T("b", { order: 2 })];
  const r = merge(base, base, server, now); assert.equal(ids(r), "c,a,b"); assert.equal(r.toUpdate.length, 0);
});
ok("syncing twice in a row is a no-op (idempotent)", () => {
  const local = [T("n1", { order: -1 }), T("a", { title: "x", updatedAt: "2026-02-01T00:00:00.000Z" }), base[2]];
  const r1 = merge(base, local, base, now);
  const r2 = merge(r1.merged, r1.merged, r1.merged, now);
  assert.equal(r2.toInsert.length + r2.toUpdate.length + r2.toDelete.length, 0);
});
ok("two devices, delete + edit race resolved the same regardless of who syncs first", () => {
  const A = [base[0], base[2]];                       // device A deleted b
  const Bd = [base[0], T("b", { title: "edited", updatedAt: "2026-02-01T00:00:00.000Z" }), base[2]]; // device B edited b
  // A syncs first (server == base): deletes b
  const rA = merge(base, A, base, now);
  // then B syncs with server = result of A
  const serverAfterA = rA.merged;
  const rB = merge(base, Bd, serverAfterA, now);
  assert.equal(ids(rB), "a,b,c"); // B's edit survives the earlier delete
});
ok("countPending counts adds, edits, deletes and a reorder", () => {
  assert.equal(countPending(base, base), 0);
  assert.equal(countPending(base, [T("n", { order: -1 }), ...base]), 1);
  assert.equal(countPending(base, [T("a", { title: "q" }), base[1], base[2]]), 1);
  assert.equal(countPending(base, [base[0], base[2]]), 1);
  assert.equal(countPending(base, [T("c", { order: 0 }), T("a", { order: 1 }), T("b", { order: 2 })]), 1);
});
console.log(`\n${n} merge scenarios passed`);
