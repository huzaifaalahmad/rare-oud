import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import api from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';

export default function MyOrders() {
  const { user, loading: authLoading } = useAuth();
  const { language, lang } = useLanguage();
  const currentLang = language || lang;
  const [orders, setOrders] = useState([]);
  const [customOrders, setCustomOrders] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [items, setItems] = useState({});
  const [state, setState] = useState({ loading: true, error: '' });
  async function load(){
    const [o,c]=await Promise.all([api.get('/orders/mine?limit=50&offset=0'), api.get('/custom-orders/mine').catch(()=>({data:{custom_orders:[]}}))]);
    setOrders(o.data.orders||[]); setCustomOrders(c.data.custom_orders||[]); setState({loading:false,error:''});
  }
  useEffect(() => { if (!user) return; let active = true; load().catch(err => active && setState({ loading: false, error: err.response?.data?.message || (currentLang === 'ar' ? 'تعذر تحميل الطلبات' : 'Failed to load requests') })); return () => { active = false; }; }, [user?.id, currentLang]);
  async function toggle(order) { if (expanded === order.id) { setExpanded(null); return; } setExpanded(order.id); if (!items[order.id]) { const { data } = await api.get(`/orders/${order.id}`); setItems(prev => ({ ...prev, [order.id]: data.items || [] })); } }
  if (authLoading) return <section className="section container">Loading...</section>;
  if (!user) return <Navigate to="/login" replace />;
  if (state.loading) return <section className="section container">Loading...</section>;
  return <section className="section"><div className="container"><h1 className="title">{currentLang === 'ar' ? 'طلباتي' : 'My Requests'}</h1>{state.error && <p className="error-box">{state.error}</p>}
    {!orders.length && <div className="card" style={{ padding: '2rem', textAlign: 'center' }}><p>{currentLang === 'ar' ? 'لا توجد طلبات منتجات بعد.' : 'No product requests yet.'}</p><Link className="btn" to="/products">{currentLang === 'ar' ? 'تصفح المنتجات' : 'Browse products'}</Link></div>}
    <div className="grid">{orders.map(order => <article className="card" key={order.id} style={{ padding: '1rem' }}><h2>{order.order_number}</h2><p><strong>{currentLang === 'ar' ? 'الحالة' : 'Status'}:</strong> <span className="status-pill">{order.status}</span></p><p><strong>{currentLang === 'ar' ? 'القيمة التقريبية' : 'Indicative value'}:</strong> ${Number(order.total || 0).toFixed(2)}</p>{order.country&&<p><strong>{currentLang === 'ar' ? 'الدولة' : 'Country'}:</strong> {order.country}</p>}{order.notes&&<p className="muted">{order.notes}</p>}<p className="muted">{new Date(order.created_at).toLocaleString(currentLang === 'ar' ? 'ar' : 'en')}</p>
      <button className="btn secondary" onClick={() => toggle(order)}>{expanded === order.id ? (currentLang === 'ar' ? 'إخفاء التفاصيل' : 'Hide details') : (currentLang === 'ar' ? 'عرض التفاصيل' : 'View details')}</button>{expanded === order.id && <div style={{ marginTop: '1rem' }}>{(items[order.id] || []).map(item => <p key={item.id}>{currentLang === 'ar' ? item.product_name_ar : item.product_name_en} × {item.quantity} — ${Number(item.total || 0).toFixed(2)}</p>)}</div>}
    </article>)}</div>
    <h2 style={{marginTop:'2rem'}}>{currentLang==='ar'?'طلبات التخصيص':'Custom Orders'}</h2><div className="grid">{customOrders.map(co=><article key={co.id} className="card" style={{padding:'1rem'}}><h3>#{co.id}</h3><p><span className="status-pill">{co.status}</span></p><p>{co.request_details}</p>{co.admin_note&&<p className="muted"><strong>{currentLang==='ar'?'رد الإدارة:':'Admin reply:'}</strong> {co.admin_note}</p>}</article>)}</div>
  </div></section>;
}
