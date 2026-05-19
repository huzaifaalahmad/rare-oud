// Lightweight API contract checks. Run against a local backend:
// node tests/api-contract.test.js http://localhost:5000
const base = process.argv[2] || 'http://localhost:5000';

async function request(path, options = {}) {
  const res = await fetch(base + path, options);
  const body = await res.text();
  let json = null;
  try { json = body ? JSON.parse(body) : null; } catch { /* noop */ }
  return { res, json, body };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

(async () => {
  let r = await request('/api/health');
  assert(r.res.status === 200 && r.json?.ok === true, 'health contract failed');

  r = await request('/api/products?limit=4');
  assert(r.res.status === 200, 'products list must return 200');
  assert(Array.isArray(r.json?.products), 'products list must include products array');
  assert(typeof r.json?.total === 'number', 'products list must include total number');

  r = await request('/api/metrics');
  assert([200, 401].includes(r.res.status), 'metrics must be exposed or token-protected');

  console.log('API contract checks passed');
})().catch((err) => { console.error(err); process.exit(1); });
