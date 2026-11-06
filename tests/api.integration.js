// Integration test for the public API, run against a local server that uses the JSON-file database (no MONGO_URI).
// It needs tiny limits so every limit can be hit. Start the server first (fresh `data/` folder), then run this file:
//
//   rm -rf data && AUTH_SECRET=test-secret-test-secret API_RATE_PER_MIN=1000 API_DAILY_QUOTA=60 API_MAX_KEYS=3 \
//     MAX_TODOS_PER_USER=4 HEALTH_TOKEN=hh-token npx next start -p 3120
//   node tests/api.integration.js
const fs = require('fs'); const path = require('path');
const B = process.env.BASE_URL || 'http://localhost:3120'; const DB = path.join(process.cwd(), 'data', 'db.json');
let pass = 0, failN = 0; const ok = (name, cond, extra='') => { cond ? pass++ : failN++; console.log(cond ? '✓' : '✗ FAIL', name, cond ? '' : extra); };
const jar = {};
const sess = async (path, opts = {}) => { const r = await fetch(B+path, { redirect:'manual', ...opts, headers:{ 'Content-Type':'application/json', cookie: Object.entries(jar).map(([k,v])=>k+'='+v).join('; '), ...(opts.headers||{}) } }); for (const c of r.headers.getSetCookie()) { const [kv] = c.split(';'); const [k,...v] = kv.split('='); /Max-Age=0/i.test(c) ? delete jar[k] : jar[k] = v.join('='); } let body=null; try { body = await r.json() } catch {} return { status:r.status, body, headers:r.headers, r } };
const api = async (key, path, opts = {}) => { const r = await fetch(B+'/api/v1'+path, { ...opts, headers: { ...(key ? { Authorization:'Bearer '+key } : {}), 'Content-Type':'application/json', ...(opts.headers||{}) } }); let body=null; try { body = await r.json() } catch {} return { status:r.status, body, h:(n)=>r.headers.get(n) } };
(async () => {
  console.log('--- setup');
  ok('register', (await sess('/api/auth/register',{method:'POST',body:JSON.stringify({name:'John Doe',email:'john@example.com',password:'password123'})})).status === 201);
  const mk = async (b) => sess('/api/account/keys', { method:'POST', body: JSON.stringify(b) });
  const rw = await mk({ name:'Full access', scopes:['todos:read','todos:write'], expiresInDays:null });
  ok('create key', rw.status === 201 && /^sk_tdn\.[A-Za-z0-9_-]{64}$/.test(rw.body.secret), JSON.stringify(rw.body));
  const KEY = rw.body.secret;
  ok('key response never contains the hash', !JSON.stringify(rw.body.key).includes('hash'));
  ok('secret is NOT stored on disk (only its hash)', !fs.readFileSync(DB,'utf8').includes(KEY));
  const ro = await mk({ name:'Read only', scopes:['todos:read'], expiresInDays:30, dailyLimit:3 });
  ok('create read-only key with daily limit 3', ro.status === 201 && ro.body.key.dailyLimit === 3);
  const qk = await mk({ name:'Quota test', scopes:['todos:read'], dailyLimit:5 }); const QK = qk.body.secret;
  const fourth = await mk({ name:'Fourth', scopes:['todos:read'] });
  ok('max keys per account enforced (3)', qk.status === 201 && fourth.status === 403, fourth.body?.error);
  ok('validation: no scopes rejected', (await mk({ name:'x', scopes:[] })).status === 400);
  ok('validation: junk scope ignored -> rejected', (await mk({ name:'x', scopes:['admin'] })).status === 400);
  ok('validation: daily limit above account limit rejected', (await mk({ name:'x', scopes:['todos:read'], dailyLimit: 999 })).status === 400);
  const RO = ro.body.secret;

  // keys issued before the sk_tdn. format ("tdn_" + 32 chars) must keep working: plant one directly in the database file
  { const crypto = require('crypto'); const legacy = 'tdn_' + 'L'.repeat(32); const d0 = JSON.parse(fs.readFileSync(DB,'utf8'));
    d0.apiKeys.push({ id:'legacy-key-id', userId: d0.users[0].id, name:'Legacy', prefix:'tdn_LLLLLLLL', hash: crypto.createHash('sha256').update(legacy).digest('hex'), scopes:['todos:read'], createdAt:new Date().toISOString(), lastUsedAt:null, expiresAt:null, dailyLimit:null });
    fs.writeFileSync(DB, JSON.stringify(d0)); ok('old-format (tdn_) keys still authenticate', (await api(legacy,'/me')).status === 200);
    d0.apiKeys = d0.apiKeys.filter(k => k.id !== 'legacy-key-id'); fs.writeFileSync(DB, JSON.stringify(d0)); }

  console.log('--- authentication');
  ok('no key -> 401 unauthorized', (await api(null,'/todos')).status === 401);
  const junk = await api('sk_tdn.'+'a'.repeat(64), '/todos'); ok('unknown (well-formed) key -> 401 invalid_key', junk.status === 401 && junk.body.error.code === 'invalid_key');
  ok('malformed key -> 401', (await api('hello','/todos')).status === 401);
  const xk = await fetch(B+'/api/v1/me', { headers: { 'X-API-Key': KEY } }); ok('X-API-Key header also works', xk.status === 200);
  ok('read-only key cannot POST -> 403 insufficient_scope', (await api(RO,'/todos',{method:'POST',body:JSON.stringify({title:'x'})})).body?.error?.code === 'insufficient_scope');
  const pre = await fetch(B+'/api/v1/todos',{method:'OPTIONS'}); ok('CORS preflight 204 + allow-origin', pre.status === 204 && pre.headers.get('access-control-allow-origin') === '*');
  ok('session cookie alone does NOT grant API access', (await fetch(B+'/api/v1/todos',{headers:{cookie:Object.entries(jar).map(([k,v])=>k+'='+v).join('; ')}})).status === 401);

  console.log('--- todos CRUD');
  const c1 = await api(KEY,'/todos',{method:'POST',body:JSON.stringify({title:'Renew car insurance',priority:'high',dueDate:'2020-01-01',tags:['Errands','errands','FINANCE']})});
  ok('create -> 201 + Location', c1.status === 201 && c1.h('location')?.endsWith(c1.body.data.id) && c1.body.data.tags.join() === 'errands,finance', JSON.stringify(c1.body));
  const id1 = c1.body.data.id;
  ok('rate-limit headers present', c1.h('x-ratelimit-limit') === '1000' && c1.h('x-quota-limit') === '60' && Number(c1.h('x-ratelimit-remaining')) >= 0);
  const c2 = await api(KEY,'/todos',{method:'POST',body:JSON.stringify({title:'Book dentist appointment'})});
  ok('create second (defaults)', c2.status === 201 && c2.body.data.priority === 'medium' && c2.body.data.completed === false);
  ok('validation: empty title -> 400 invalid_body', (await api(KEY,'/todos',{method:'POST',body:JSON.stringify({title:' '})})).body?.error?.code === 'invalid_body');
  const g = await api(KEY,'/todos/'+id1); ok('get one', g.status === 200 && g.body.data.title === 'Renew car insurance');
  ok('get unknown -> 404', (await api(KEY,'/todos/does-not-exist')).status === 404);
  const p = await api(KEY,'/todos/'+id1,{method:'PATCH',body:JSON.stringify({completed:true})}); ok('patch completed sets completedAt', p.status === 200 && p.body.data.completed && p.body.data.completedAt && p.body.data.title === 'Renew car insurance');
  ok('patch with no fields -> 400', (await api(KEY,'/todos/'+id1,{method:'PATCH',body:'{}'})).status === 400);
  const l = await api(RO,'/todos?completed=true'); ok('list filter completed=true (via read-only key)', l.status === 200 && l.body.total === 1 && l.body.data[0].id === id1);
  ok('filter tag=finance', (await api(KEY,'/todos?tag=finance')).body.total === 1);
  ok('filter overdue=true excludes completed', (await api(KEY,'/todos?overdue=true')).body.total === 0);
  ok('search q=dentist', (await api(KEY,'/todos?q=dentist')).body.data[0]?.id === c2.body.data.id);
  ok('bad priority -> 400', (await api(KEY,'/todos?priority=urgent')).status === 400);
  const lim = await api(KEY,'/todos?limit=1&offset=1'); ok('pagination limit/offset', lim.body.data.length === 1 && lim.body.total === 2 && lim.body.limit === 1 && lim.body.offset === 1);

  console.log('--- account todo limit (4)');
  await api(KEY,'/todos',{method:'POST',body:JSON.stringify({title:'three'})}); await api(KEY,'/todos',{method:'POST',body:JSON.stringify({title:'four'})});
  const over = await api(KEY,'/todos',{method:'POST',body:JSON.stringify({title:'five'})}); ok('5th todo via API -> 403 todo_limit_reached', over.status === 403 && over.body.error.code === 'todo_limit_reached', JSON.stringify(over.body));
  const web = await sess('/api/todos',{method:'POST',body:JSON.stringify({title:'five (web)'})}); ok('5th todo via the web app is limited too', web.status === 403, JSON.stringify(web.body));
  ok('delete -> 204', (await api(KEY,'/todos/'+c2.body.data.id,{method:'DELETE'})).status === 204);
  ok('after a delete there is room again', (await api(KEY,'/todos',{method:'POST',body:JSON.stringify({title:'five'})})).status === 201);
  const cc = await api(KEY,'/todos/clear-completed',{method:'POST'}); ok('clear-completed removes the done one', cc.body.removed === 1);

  console.log('--- me / usage');
  const me = await api(KEY,'/me'); ok('/me', me.body.user.email === 'john@example.com' && me.body.todos.limit === 4 && me.body.limits.requestsPerMinute === 1000 && !JSON.stringify(me.body).includes('hash'));
  const us = await api(KEY,'/usage'); ok('/usage has 7 days and counts today', us.body.last7Days.length === 7 && us.body.today.used > 10 && us.body.today.limit === 60, JSON.stringify(us.body.today));

  console.log('--- quotas');
  const qs = []; for (let i = 0; i < 7; i++) qs.push(await api(QK,'/me'));
  ok('per-key daily limit (5): calls 1-5 ok, 6th -> 429 quota_exceeded', qs.slice(0,5).every(r => r.status === 200) && qs[5].status === 429 && qs[5].body.error.code === 'quota_exceeded', qs.map(r=>r.status).join());
  ok('quota 429 carries Retry-After and zero remaining', Number(qs[5].h('retry-after')) > 0 && qs[5].h('x-quota-remaining') === '0' && qs[5].h('x-quota-limit') === '5');
  ok('quota headers count down', qs[0].h('x-quota-remaining') === '4' && qs[3].h('x-quota-remaining') === '1');
  const r2 = await api(RO,'/todos'), r3 = await api(RO,'/todos'), r4 = await api(RO,'/todos');
  ok('another key with limit 3: 4th request refused (limits are per key)', [r2.status, r3.status].every(s => s === 200) && r4.status === 429 && r4.body.error.code === 'quota_exceeded', [r2.status,r3.status,r4.status].join());
  ok('the full-access key is unaffected by the others', (await api(KEY,'/me')).status === 200);
  const list0 = await sess('/api/account/keys'); const roId = list0.body.keys.find(k => k.name === 'Read only').id;
  const uRo = list0.body.keys.find(k => k.name === 'Read only').usage; ok('management list shows usage for a key at its limit', uRo.today >= 3 && uRo.limit === 3 && uRo.days.length === 7);
  ok('delete a key', (await sess('/api/account/keys/'+roId,{method:'DELETE'})).status === 200);
  ok('deleted key stops working immediately', (await api(RO,'/todos')).status === 401);
  const FR = QK;

  console.log('--- expiry');
  const d = JSON.parse(fs.readFileSync(DB,'utf8')); const fk = d.apiKeys.find(k => k.name === 'Full access'); fk.expiresAt = new Date(Date.now()-1000).toISOString(); fs.writeFileSync(DB, JSON.stringify(d));
  const ex = await api(KEY,'/me'); ok('expired key -> 401 key_expired', ex.status === 401 && ex.body.error.code === 'key_expired');

  console.log('--- management API (session)');
  const gl = await sess('/api/account/keys'); ok('list keys shows usage + limits, no hashes', gl.status === 200 && gl.body.keys.every(k => k.usage && !('hash' in k)) && gl.body.limits.keys === 3);
  ok('management needs a session (API key is not enough)', (await fetch(B+'/api/account/keys',{headers:{Authorization:'Bearer '+FR}})).status === 401);

  console.log('--- misc');
  const spec = await (await fetch(B+'/api/v1/openapi.json')).json(); ok('openapi.json: 3.1 with paths', spec.openapi === '3.1.0' && Object.keys(spec.paths).length === 5);
  const h1 = await (await fetch(B+'/api/health')).json(); ok('health: public, no db', h1.ok === true && typeof h1.coldStart === 'boolean' && !('db' in h1));
  ok('health deep without token -> 404', (await fetch(B+'/api/health?deep=1')).status === 404);
  const h2 = await (await fetch(B+'/api/health?deep=1',{headers:{Authorization:'Bearer hh-token'}})).json(); ok('health deep with token reports db timings', h2.db?.kind === 'file' && h2.db.roundTripMs.length === 3, JSON.stringify(h2));
  const docs = await fetch(B+'/docs'); const dt = await docs.text(); ok('/docs renders (public) with endpoints', docs.status === 200 && dt.includes('/api/v1/todos') && dt.includes('Authentication'));
  // SSR: home page already contains the todos (no client fetch needed)
  await sess('/api/todos',{method:'POST',body:JSON.stringify({title:'Visible in first HTML'})}).catch(()=>{});
  const home = await (await fetch(B+'/', { headers:{ cookie:Object.entries(jar).map(([k,v])=>k+'='+v).join('; ') } })).text();
  ok('home page HTML already includes the user\'s todos (no client waterfall)', home.includes('Renew car insurance') || home.includes('three') || home.includes('Visible in first HTML') || home.includes('five'));
  console.log('--- account deletion cascades');
  await sess('/api/account',{method:'DELETE',body:JSON.stringify({confirm:'john@example.com',password:'password123'})});
  const after = JSON.parse(fs.readFileSync(DB,'utf8')); ok('keys + usage removed with the account', after.apiKeys.length === 0 && after.apiUsage.length === 0 && after.todos.length === 0, JSON.stringify({k:after.apiKeys.length,u:after.apiUsage.length}));
  console.log(`\n${pass} passed, ${failN} failed`); process.exit(failN ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
