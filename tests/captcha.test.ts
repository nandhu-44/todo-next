import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { POW_MAX_NUMBER, POW_TTL_MS, checkPow, createPow, type PowChallenge } from "../src/lib/pow.ts";

let n = 0;
const ok = (name: string, fn: () => void) => { fn(); console.log("✓", name); n++; };
const SECRET = Buffer.from("test-secret-test-secret-test-secret");
const sha = (s: string) => createHash("sha256").update(s).digest("hex");
/** what the browser does: try numbers until the hash matches */
function solve(c: PowChallenge): number { for (let i = 0; i <= c.maxnumber; i++) if (sha(c.salt + i) === c.challenge) return i; throw new Error("unsolvable"); }
const pack = (c: PowChallenge, number: number, patch: Record<string, unknown> = {}) =>
  Buffer.from(JSON.stringify({ algorithm: c.algorithm, challenge: c.challenge, salt: c.salt, signature: c.signature, number, ...patch })).toString("base64");

ok("a correctly solved challenge is accepted", () => {
  const c = createPow(Date.now(), SECRET, 5000);
  const r = checkPow(pack(c, solve(c)), Date.now(), SECRET);
  assert.ok(r.ok);
});
ok("the hard-coded difficulty is solvable and costly (tens of thousands of hashes)", () => {
  assert.ok(POW_MAX_NUMBER >= 30_000 && POW_MAX_NUMBER <= 500_000);
  const c = createPow(Date.now(), SECRET);
  assert.equal(c.maxnumber, POW_MAX_NUMBER);
  assert.ok(solve(c) >= 0);
});
ok("a wrong number is rejected", () => {
  const c = createPow(Date.now(), SECRET, 5000);
  const right = solve(c);
  const r = checkPow(pack(c, right + 1), Date.now(), SECRET);
  assert.ok(!r.ok && r.reason === "invalid");
});
ok("a challenge not issued by this server (forged signature) is rejected", () => {
  const c = createPow(Date.now(), SECRET, 5000);
  const r = checkPow(pack(c, solve(c)), Date.now(), Buffer.from("a-different-server-secret-here-000"));
  assert.ok(!r.ok && r.reason === "invalid");
});
ok("an attacker can't make their own easy challenge (needs the server's signature)", () => {
  const salt = `abcdef?expires=${Date.now() + 60_000}`;
  const challenge = sha(salt + 1);
  const forged = Buffer.from(JSON.stringify({ algorithm: "SHA-256", challenge, salt, signature: "00".repeat(32), number: 1 })).toString("base64");
  const r = checkPow(forged, Date.now(), SECRET);
  assert.ok(!r.ok && r.reason === "invalid");
});
ok("tampering with the expiry in the salt breaks the hash", () => {
  const c = createPow(Date.now(), SECRET, 5000);
  const n0 = solve(c);
  const r = checkPow(pack(c, n0, { salt: c.salt.replace(/\d+$/, String(Date.now() + 10 * 86_400_000)) }), Date.now(), SECRET);
  assert.ok(!r.ok);
});
ok("an expired solution is rejected", () => {
  const c = createPow(Date.now(), SECRET, 5000);
  const r = checkPow(pack(c, solve(c)), Date.now() + POW_TTL_MS + 1000, SECRET);
  assert.ok(!r.ok && r.reason === "expired");
});
ok("garbage input never throws", () => {
  for (const junk of [undefined, null, "", "not base64 json", Buffer.from("{}").toString("base64"), Buffer.from("[1,2]").toString("base64"), 42, {}, Buffer.from(JSON.stringify({ algorithm: "SHA-256", challenge: 1, salt: 2, signature: 3, number: "x" })).toString("base64")]) {
    assert.equal(checkPow(junk as never, Date.now(), SECRET).ok, false);
  }
});
ok("the same solution always maps to the same spend id (so a replay is caught)", () => {
  const c = createPow(Date.now(), SECRET, 5000);
  const a = checkPow(pack(c, solve(c)), Date.now(), SECRET), b = checkPow(pack(c, solve(c)), Date.now(), SECRET);
  assert.ok(a.ok && b.ok && a.id === b.id);
});
console.log(`\n${n} captcha checks passed`);
