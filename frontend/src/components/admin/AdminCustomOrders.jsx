import { useEffect, useState } from 'react';
import api from '../../services/api.js';
import { useLanguage } from '../../context/LanguageContext.jsx';

const STATUSES = ['pending', 'approved', 'rejected', 'in_progress', 'completed'];

function shortText(value, max = 80) {
  if (!value) return '-';
  return value.length > max ? `${value.slice(0, max)}...` : value;
}

export default function AdminCustomOrders() {
  const { lang } = useLanguage();
  const [items, setItems] = useState([]);
  const [notes, setNotes] = useState({});
  const [page, setPage] = useState({ limit: 50, offset: 0, total: 0 });
  const [state, setState] = useState({ loading: true, error: '', message: '' });

  async function load(nextOffset = page.offset) {
    setState(s => ({ ...s, loading: true, error: '' }));
    const { data } = await api.get('/custom-orders/admin', { params: { limit: page.limit, offset: nextOffset } });
    const list = data.custom_orders || [];
    setItems(list);
    setNotes(list.reduce((acc, order) => ({ ...acc, [order.id]: order.admin_note || '' }), {}));
    setPage(p => ({ ...p, offset: nextOffset, total: Number(data.total || 0) }));
    setState(s => ({ ...s, loading: false }));
  }

  useEffect(() => {
    load(0).catch(e => setState({ loading: false, error: e.response?.data?.message || 'تعذر تحميل طلبات التخصيص', message: '' }));
  }, []);

  async function update(id, status) {
    setState(s => ({ ...s, error: '', message: '' }));
    try {
      const admin_note = notes[id] !== undefined ? notes[id] : undefined;
      await api.patch(`/custom-orders/${id}`, { status, admin_note });
      setItems(list => list.map(item => item.id === id ? { ...item, status, admin_note } : item));
      setState(s => ({ ...s, message: lang === 'ar' ? 'تم تحديث الطلب وإرسال الرد' : 'Custom order updated' }));
    } catch (e) {
      setState(s => ({ ...s, error: e.response?.data?.message || 'تعذر تحديث الطلب' }));
    }
  }

  const canPrev = page.offset > 0;
  const canNext = page.offset + page.limit < page.total;

  return <div>
    <h2>{lang === 'ar' ? 'طلبات التخصيص' : 'Custom Orders'}</h2>
    {state.error && <p className="error-box">{state.error}</p>}
    {state.message && <p className="success-box">{state.message}</p>}
    {state.loading ? <p>Loading...</p> : <table className="table">
      <thead>
        <tr>
          <th>ID</th>
          <th>{lang === 'ar' ? 'الاسم' : 'Name'}</th>
          <th>{lang === 'ar' ? 'الهاتف' : 'Phone'}</th>
          <th>{lang === 'ar' ? 'الميزانية' : 'Budget'}</th>
          <th>{lang === 'ar' ? 'التفاصيل' : 'Details'}</th>
          <th>{lang === 'ar' ? 'الرد' : 'Reply'}</th>
          <th>{lang === 'ar' ? 'الحالة' : 'Status'}</th>
          <th>{lang === 'ar' ? 'تاريخ الإنشاء' : 'Created'}</th>
        </tr>
      </thead>
      <tbody>{items.map(o => <tr key={o.id}>
        <td>{o.id}</td>
        <td>{o.name}</td>
        <td>{o.phone}</td>
        <td>{o.budget ? `$${Number(o.budget).toFixed(2)}` : '-'}</td>
        <td title={o.request_details || ''}>{shortText(o.request_details)}</td>
        <td>
          <textarea
            rows="2"
            placeholder={lang === 'ar' ? 'اكتب رداً للعميل...' : 'Write a reply...'}
            value={notes[o.id] ?? o.admin_note ?? ''}
            onChange={e => setNotes(n => ({ ...n, [o.id]: e.target.value }))}
            style={{ minWidth: 220 }}
          />
        </td>
        <td>
          <select value={o.status} onChange={e => update(o.id, e.target.value)}>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </td>
        <td>{new Date(o.created_at).toLocaleString(lang === 'ar' ? 'ar' : 'en')}</td>
      </tr>)}</tbody>
    </table>}
    <div className="actions-row">
      <button className="icon-btn" disabled={!canPrev} onClick={() => load(Math.max(page.offset - page.limit, 0))}>{lang === 'ar' ? 'السابق' : 'Prev'}</button>
      <span>{page.total ? page.offset + 1 : 0}-{Math.min(page.offset + page.limit, page.total)} / {page.total}</span>
      <button className="icon-btn" disabled={!canNext} onClick={() => load(page.offset + page.limit)}>{lang === 'ar' ? 'التالي' : 'Next'}</button>
    </div>
  </div>;
}
