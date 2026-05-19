import { useEffect, useState } from 'react';
import api from '../../services/api.js';

export default function AdminSystemHealth(){
 const [data,setData]=useState(null); const [error,setError]=useState(''); const [loading,setLoading]=useState(true);
 async function load(){ try{ setLoading(true); const res=await api.get('/admin/system/health'); setData(res.data); setError(''); }catch(e){ setError(e.response?.data?.message||e.message); }finally{ setLoading(false); } }
 async function retry(name){ await api.post(`/admin/system/queues/${name}/retry-failed`, { limit: 50 }); load(); }
 useEffect(()=>{ load(); const id=setInterval(load,15000); return()=>clearInterval(id); },[]);
 if(loading&&!data) return <div className="skeleton">Loading system health...</div>;
 if(error) return <div className="alert error">{error}</div>;
 return <div className="admin-stack">
  <h2>System Health</h2>
  <div className="stats-grid">
   <div className="stat-card"><strong>API</strong><span>{data?.ok?'Healthy':'Degraded'}</span></div>
   <div className="stat-card"><strong>Database</strong><span>{data?.database}</span></div>
   <div className="stat-card"><strong>Redis</strong><span>{data?.redis}</span></div>
   <div className="stat-card"><strong>Uptime</strong><span>{Math.round(data?.uptime||0)}s</span></div>
  </div>
  <h3>Queues</h3>
  <div className="table-wrap"><table><thead><tr><th>Queue</th><th>Waiting</th><th>Active</th><th>Delayed</th><th>Failed</th><th>Completed</th><th>Action</th></tr></thead><tbody>{(data?.queues||[]).map(q=><tr key={q.name}><td>{q.name}</td><td>{q.waiting}</td><td>{q.active}</td><td>{q.delayed}</td><td>{q.failed}</td><td>{q.completed}</td><td>{q.failed>0&&<button onClick={()=>retry(q.name)}>Retry failed</button>}</td></tr>)}</tbody></table></div>
 </div>;
}
