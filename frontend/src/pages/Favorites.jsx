import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { MessageCircle, Trash2 } from 'lucide-react';
import api from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import { mediaUrl } from '../utils/media.js';
export default function Favorites(){
  const {user,loading:authLoading}=useAuth(); const {lang}=useLanguage(); const [items,setItems]=useState([]); const [loading,setLoading]=useState(true);
  async function load(){const {data}=await api.get('/favorites'); setItems(data.items||data.favorites||[]); setLoading(false)}
  useEffect(()=>{if(user) load().catch(()=>setLoading(false))},[user?.id]);
  async function remove(id){await api.post(`/favorites/${id}/toggle`); setItems(v=>v.filter(x=>(x.product_id||x.id)!==id));}
  if(authLoading) return <section className="section container">Loading...</section>;
  if(!user) return <Navigate to="/login" replace/>;
  if(loading) return <section className="section container">Loading...</section>;
  return <section className="section"><div className="container"><h1 className="title">{lang==='ar'?'المفضلة':'Favorites'}</h1>{!items.length&&<div className="card" style={{padding:'2rem',textAlign:'center'}}><p>{lang==='ar'?'لا توجد منتجات مفضلة بعد.':'No favorite products yet.'}</p><Link className="btn" to="/products">{lang==='ar'?'تصفح المنتجات':'Browse products'}</Link></div>}<div className="grid">{items.map(item=>{const p=item.product||item; const id=p.product_id||p.id; const name=lang==='ar'?p.name_ar:p.name_en; return <article className="card favorite-card" key={id} style={{padding:'1rem'}}><img src={mediaUrl(p.primary_image)} alt={name} loading="lazy" decoding="async"/><h3>{name}</h3><p className="muted">${Number(p.price||0).toFixed(2)}</p><div className="actions-row"><Link className="btn" to={`/products/${p.slug||id}`}><MessageCircle size={16}/> {lang==='ar'?'طلب / استفسار':'Request / Inquiry'}</Link><button className="icon-btn" onClick={()=>remove(id)}><Trash2 size={16}/> {lang==='ar'?'إزالة':'Remove'}</button></div></article>})}</div></div></section>
}
