import { useEffect, useState } from 'react';
import api from '../../services/api.js';
import { useLanguage } from '../../context/LanguageContext.jsx';

export default function AdminSiteReviews() {
  const { lang } = useLanguage();
  const isAr = lang === 'ar';
  const [reviews, setReviews] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const t = {
    title: isAr ? 'تقييمات الموقع' : 'Site Reviews',
    name: isAr ? 'الاسم' : 'Name',
    rating: isAr ? 'التقييم' : 'Rating',
    comment: isAr ? 'التعليق' : 'Comment',
    status: isAr ? 'الحالة' : 'Status',
    actions: isAr ? 'إجراءات' : 'Actions',
    approved: isAr ? 'معتمد' : 'Approved',
    pending: isAr ? 'بانتظار الموافقة' : 'Pending',
    approve: isAr ? 'اعتماد' : 'Approve',
    hide: isAr ? 'إخفاء' : 'Hide',
    delete: isAr ? 'حذف' : 'Delete',
    loading: isAr ? 'جارٍ التحميل...' : 'Loading...',
    guest: isAr ? 'زائر' : 'Guest',
    loadError: isAr ? 'تعذر تحميل تقييمات الموقع' : 'Unable to load site reviews',
    updateError: isAr ? 'تعذر تحديث التقييم' : 'Unable to update review',
    deleteError: isAr ? 'تعذر حذف التقييم' : 'Unable to delete review',
    deleteConfirm: isAr ? 'هل تريد حذف تقييم الموقع هذا؟' : 'Delete this site review?'
  };

  async function load() {
    setLoading(true);
    const { data } = await api.get('/reviews/site/admin');
    setReviews(data.reviews || []);
    setLoading(false);
  }

  useEffect(() => { load().catch(() => { setError(t.loadError); setLoading(false); }); }, [lang]);

  async function approve(id, approved) {
    setError('');
    try { await api.patch(`/reviews/site/${id}/approve`, { approved }); await load(); }
    catch (e) { setError(e.response?.data?.message || t.updateError); }
  }

  async function remove(id) {
    // Translate destructive action confirmation in the bilingual admin dashboard.
    if (!confirm(t.deleteConfirm)) return;
    setError('');
    try { await api.delete(`/reviews/site/${id}`); await load(); }
    catch (e) { setError(e.response?.data?.message || t.deleteError); }
  }

  return <div>
    <h2>{t.title}</h2>
    {error && <p className="error-box">{error}</p>}
    {loading ? <p>{t.loading}</p> : <table className="table">
      <thead><tr><th>{t.name}</th><th>{t.rating}</th><th>{t.comment}</th><th>{t.status}</th><th>{t.actions}</th></tr></thead>
      <tbody>{reviews.map(r => <tr key={r.id}>
        <td>{r.name || r.user_name || t.guest}</td>
        <td>{'★'.repeat(Number(r.rating) || 0)}</td>
        <td>{r.comment}</td>
        <td>{r.is_approved ? t.approved : t.pending}</td>
        <td><button className="icon-btn" onClick={() => approve(r.id, !r.is_approved)}>{r.is_approved ? t.hide : t.approve}</button> <button className="icon-btn" onClick={() => remove(r.id)}>{t.delete}</button></td>
      </tr>)}</tbody>
    </table>}
  </div>;
}
