import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Bell, CheckCheck } from 'lucide-react';
import api from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';

export default function Notifications(){
  const { user, loading: authLoading } = useAuth();
  const { lang } = useLanguage();
  const [state,setState]=useState({loading:true,error:'',notifications:[],unread:0});
  async function load(markAsRead = false){
    const {data}=await api.get('/notifications');
    const unreadCount = Number(data.unread||0);
    const notifications = data.notifications||[];
    if(markAsRead && unreadCount > 0){
      await api.patch('/notifications/read-all');
      window.dispatchEvent(new CustomEvent('rare-oud:notifications-updated'));
      setState({loading:false,error:'',notifications:notifications.map(n=>({...n,is_read:1,read_at:n.read_at||new Date().toISOString()})),unread:0});
      return;
    }
    setState({loading:false,error:'',notifications,unread:unreadCount});
  }
  useEffect(()=>{ if(user) load(true).catch(()=>setState({loading:false,error:lang==='ar'?'تعذر تحميل الإشعارات':'Unable to load notifications',notifications:[],unread:0})); },[user?.id, lang]);
  async function markAll(){ await api.patch('/notifications/read-all'); window.dispatchEvent(new CustomEvent('rare-oud:notifications-updated')); await load(); }
  if(authLoading) return <section className="section container">Loading...</section>;
  if(!user) return <Navigate to="/login" replace />;
  if(state.loading) return <section className="section container">Loading...</section>;
  return <section className="section"><div className="container">
    <div className="actions-row"><h1 className="title"><Bell size={24}/> {lang==='ar'?'الإشعارات':'Notifications'}</h1>{state.unread>0&&<button className="btn btn-ghost" onClick={markAll}><CheckCheck size={16}/> {lang==='ar'?'تعليم الكل كمقروء':'Mark all read'}</button>}</div>
    {state.error&&<p className="error-box">{state.error}</p>}
    {!state.notifications.length&&<div className="card" style={{padding:'2rem',textAlign:'center'}}>{lang==='ar'?'لا توجد إشعارات.':'No notifications.'}</div>}
    <div className="grid">{state.notifications.map(n=><article key={n.id} className="card" style={{padding:'1rem',borderColor:n.is_read?'':'var(--gold)'}}>
      <strong>{n[`title_${lang}`]||n.title_en}</strong><p className="muted">{new Date(n.created_at).toLocaleString(lang==='ar'?'ar':'en')}</p><p>{n[`body_${lang}`]||n.body_en}</p>{n.link_url&&<Link className="btn btn-ghost" to={n.link_url}>{lang==='ar'?'فتح':'Open'}</Link>}
    </article>)}</div>
  </div></section>;
}
