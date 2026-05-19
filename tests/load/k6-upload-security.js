import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 10 },
    { duration: '1m', target: 25 },
    { duration: '30s', target: 0 }
  ],
  thresholds: {
    http_req_failed: ['rate<0.02'],
    http_req_duration: ['p(95)<750']
  }
};

export default function () {
  const base = __ENV.BASE_URL || 'http://localhost:5000';
  const res = http.get(`${base}/api/health`);
  check(res, { 'health ok': r => r.status === 200 });
  sleep(1);
}
