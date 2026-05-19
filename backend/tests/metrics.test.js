const EventEmitter = require('events');
const metrics = require('../utils/metrics');

describe('prometheus metrics', () => {
  test('records counters and known histograms', async () => {
    metrics.inc('qa_counter_total');
    metrics.observe('queue_job_duration_seconds', 0.12, { queue: 'email', name: 'send', status: 'completed' });
    metrics.observe('db_query_duration_seconds', 0.03, { query: 'SELECT 1' });

    const output = await metrics.prometheus();
    expect(output).toContain('rare_oud_qa_counter_total');
    expect(output).toContain('rare_oud_queue_job_duration_seconds');
    expect(output).toContain('rare_oud_db_query_duration_seconds');
  });

  test('middleware records request completion and server errors', async () => {
    const req = { method: 'GET', path: '/api/health', route: { path: '/health' } };
    const res = new EventEmitter();
    res.statusCode = 503;
    const next = jest.fn();

    metrics.middleware(req, res, next);
    expect(next).toHaveBeenCalled();
    res.emit('finish');

    const output = await metrics.prometheus();
    expect(output).toContain('rare_oud_http_requests_total');
    expect(output).toContain('rare_oud_http_errors_total');
  });
});
