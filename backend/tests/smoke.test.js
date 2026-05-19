// Minimal smoke checklist for manual/API testing after starting the backend.
// Run: npm run test:smoke -- http://localhost:5000
const base = process.argv[2] || 'http://localhost:5000';
async function check(path, expected = 200) {
  const res = await fetch(base + path);
  if (res.status !== expected) throw new Error(`${path} returned ${res.status}, expected ${expected}`);
  return res.json().catch(() => ({}));
}
(async () => {
  const health = await check('/api/health');
  if (!health.ok) throw new Error('Health endpoint did not return ok=true');
  await check('/api/categories');
  await check('/api/products');
  console.log('Smoke tests passed for', base);
})().catch((err) => { console.error(err); process.exit(1); });
