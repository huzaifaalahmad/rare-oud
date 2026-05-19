const client = require('prom-client');
const register = new client.Registry();
client.collectDefaultMetrics({ register, prefix: 'rare_oud_' });
const httpDuration = new client.Histogram({ name: 'rare_oud_http_request_duration_seconds', help: 'HTTP request duration', labelNames: ['method','route','status'], buckets: [0.01,0.05,0.1,0.25,0.5,1,2,5] });
const queueDuration = new client.Histogram({ name: 'rare_oud_queue_job_duration_seconds', help: 'Queue job processing duration', labelNames: ['queue','name','status'], buckets: [0.05,0.1,0.25,0.5,1,2,5,10,30] });
const dbDuration = new client.Histogram({ name: 'rare_oud_db_query_duration_seconds', help: 'Database query duration', labelNames: ['query'], buckets: [0.005,0.01,0.025,0.05,0.1,0.25,0.5,1,2,5] });
const counters = new Map();
register.registerMetric(httpDuration);
register.registerMetric(queueDuration);
register.registerMetric(dbDuration);
function counter(name) {
  if (!counters.has(name)) {
    const c = new client.Counter({ name: `rare_oud_${name}`, help: `${name} counter` });
    register.registerMetric(c);
    counters.set(name, c);
  }
  return counters.get(name);
}
function inc(name, value = 1) { counter(name).inc(value); }
function observe(name, value, labels = {}) {
  if (name === 'queue_job_duration_seconds') return queueDuration.observe(labels, value);
  if (name === 'db_query_duration_seconds') return dbDuration.observe(labels, value);
}

function middleware(req, res, next) {
  const end = httpDuration.startTimer();
  res.on('finish', () => {
    inc('http_requests_total');
    if (res.statusCode >= 500) inc('http_errors_total');
    end({ method: req.method, route: req.route?.path || req.path, status: String(res.statusCode) });
  });
  next();
}
async function prometheus() { return register.metrics(); }
module.exports = { inc, observe, middleware, prometheus, register };
