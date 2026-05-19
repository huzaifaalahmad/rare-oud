import http from 'k6/http'; import { check, sleep } from 'k6';
export const options = { thresholds:{ http_req_failed:['rate<0.01'], http_req_duration:['p(95)<500'] }, stages:[{duration:'30s',target:20},{duration:'1m',target:50},{duration:'30s',target:0}] };
export default function(){ const base=__ENV.BASE_URL||'http://localhost:5000'; const res=http.get(`${base}/api/health`); check(res,{ 'health ok': r => r.status===200 }); sleep(1); }
