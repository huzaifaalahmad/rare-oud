import { useEffect, useState } from 'react';
import api from '../../services/api.js';

export function AdminUsers(){
 const [users,setUsers]=useState([]); const [error,setError]=useState('');
 async function load(){const {data}=await api.get('/users'); setUsers(data.users||[])}
 useEffect(()=>{load().catch(()=>setError('تعذر تحميل المستخدمين'))},[]);
 async function updateUser(u, patch){setError(''); try{await api.put(`/users/${u.id}`,{name:u.name,phone:u.phone||'',role:patch.role ?? u.role,is_active:patch.is_active ?? u.is_active}); await load();}catch(e){setError(e.response?.data?.message||'تعذر تعديل المستخدم')}}
 async function removeUser(id){if(confirm('Disable this user?')){await api.delete(`/users/${id}`); await load();}}
 return <div><h2>Users</h2>{error&&<p className="error-box">{error}</p>}<table className="table"><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Active</th><th></th></tr></thead><tbody>{users.map(u=><tr key={u.id}><td>{u.name}</td><td>{u.email}</td><td><select value={u.role} onChange={e=>updateUser(u,{role:e.target.value})}><option value="user">user</option><option value="admin">admin</option></select></td><td>{u.is_active?'Yes':'No'}</td><td><button className="icon-btn" onClick={()=>updateUser(u,{is_active:!u.is_active})}>{u.is_active?'Disable':'Enable'}</button> <button className="icon-btn" onClick={()=>removeUser(u.id)}>Delete</button></td></tr>)}</tbody></table></div>
}
export function AdminReviews(){
 const [reviews,setReviews]=useState([]); async function load(){const {data}=await api.get('/reviews/admin'); setReviews(data.reviews||[])} useEffect(()=>{load().catch(()=>{})},[]);
 async function approve(id,approved){await api.patch(`/reviews/${id}/approve`,{approved}); load()}
 return <div><h2>Reviews</h2><table className="table"><tbody>{reviews.map(r=><tr key={r.id}><td>{r.user_name}</td><td>{r.product_name_ar}</td><td>{'★'.repeat(r.rating)}</td><td>{r.is_approved?'Approved':'Pending'}</td><td><button className="icon-btn" onClick={()=>approve(r.id,!r.is_approved)}>{r.is_approved?'Hide':'Approve'}</button></td></tr>)}</tbody></table></div>
}
export function AdminCustomOrders(){
 const [items,setItems]=useState([]); async function load(){const {data}=await api.get('/custom-orders/admin'); setItems(data.custom_orders||[])} useEffect(()=>{load().catch(()=>{})},[]);
 async function update(id,status){await api.patch(`/custom-orders/${id}`,{status}); load()}
 return <div><h2>Custom Orders</h2><table className="table"><tbody>{items.map(o=><tr key={o.id}><td>{o.name}<br/><small>{o.phone}</small></td><td>{o.request_details}</td><td><select value={o.status} onChange={e=>update(o.id,e.target.value)}><option value="pending">pending</option><option value="approved">approved</option><option value="rejected">rejected</option><option value="in_progress">in_progress</option><option value="completed">completed</option></select></td></tr>)}</tbody></table></div>
}
