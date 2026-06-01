import { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '../../context/LanguageContext.jsx';
import api from '../../services/api.js';

const statuses = ['pending', 'approved', 'rejected', 'in_progress', 'completed'];
const labels = {
  en: { pending: 'Pending', approved: 'Approved', rejected: 'Rejected', in_progress: 'In Progress', completed: 'Completed' },
  ar: { pending: 'بانتظار المراجعة', approved: 'مقبول', rejected: 'مرفوض', in_progress: 'قيد التنفيذ', completed: 'مكتمل' }
};

function itemName(item, isArabic) {
  return isArabic
    ? item.product_name_ar || item.product_name_en || item.product_current_name_ar || item.product_current_name_en || '-'
    : item.product_name_en || item.product_name_ar || item.product_current_name_en || item.product_current_name_ar || '-';
}

function itemMeta(item, isArabic) {
  const wood = isArabic ? item.product_woods_ar : item.product_woods_en;
  const origin = isArabic ? item.product_origin_country_ar : item.product_origin_country_en;
  const maker = isArabic ? item.product_maker_identity_ar : item.product_maker_identity_en;
  return [
    item.product_sku && `SKU: ${item.product_sku}`,
    item.product_dimensions && `${isArabic ? 'القياسات' : 'Dimensions'}: ${item.product_dimensions}`,
    wood && `${isArabic ? 'الخشب' : 'Wood'}: ${wood}`,
    origin && `${isArabic ? 'المنشأ' : 'Origin'}: ${origin}`,
    maker && `${isArabic ? 'الصانع' : 'Maker'}: ${maker}`,
    item.product_condition_status && `${isArabic ? 'الحالة' : 'Condition'}: ${item.product_condition_status}`
  ].filter(Boolean).join(' | ');
}

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState({ limit: 50, offset: 0, total: 0 });
  const { lang } = useLanguage();
  const isArabic = lang === 'ar';
  const statusLabels = labels[isArabic ? 'ar' : 'en'];

  async function load(nextOffset = page.offset) {
    const { data } = await api.get('/orders', {
      params: { status: status || undefined, limit: page.limit, offset: nextOffset }
    });
    setOrders(data.orders || []);
    setPage(p => ({ ...p, offset: nextOffset, total: Number(data.total || 0) }));
  }

  useEffect(() => {
    load(0).catch(() => setError(isArabic ? 'تعذر تحميل طلبات المنتجات' : 'Failed to load product requests'));
  }, [status, isArabic]);

  async function update(id, nextStatus) {
    setError('');
    try {
      await api.put(`/orders/${id}/status`, { status: nextStatus });
      await load();
    } catch (err) {
      setError(err.response?.data?.message || (isArabic ? 'تعذر تحديث الطلب' : 'Failed to update request'));
    }
  }

  const filtered = useMemo(
    () => orders.filter(o =>
      `${o.order_number} ${o.customer_name} ${o.customer_phone} ${o.country || ''} ${(o.items || []).map(item => `${item.product_name_ar} ${item.product_name_en} ${item.product_sku || ''}`).join(' ')}`.toLowerCase().includes(q.toLowerCase())
    ),
    [orders, q]
  );

  const canPrev = page.offset > 0;
  const canNext = page.offset + page.limit < page.total;

  return (
    <div>
      <div className="admin-header-row">
        <div>
          <h2>{isArabic ? 'طلبات المنتجات المباشرة' : 'Direct Product Requests'}</h2>
          <p className="muted">
            {isArabic
              ? 'طلبات المنتج المباشرة بدون سلة أو دفع إلكتروني.'
              : 'Direct product requests without cart or online payment.'}
          </p>
        </div>
        <div className="actions-row">
          <input
            placeholder={isArabic ? 'بحث' : 'Search'}
            value={q}
            onChange={e => setQ(e.target.value)}
          />
          <select value={status} onChange={e => setStatus(e.target.value)}>
            <option value="">{isArabic ? 'كل الحالات' : 'All statuses'}</option>
            {statuses.map(s => <option key={s} value={s}>{statusLabels[s]}</option>)}
          </select>
        </div>
      </div>

      {error && <p className="error-box">{error}</p>}

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>#</th>
              <th>{isArabic ? 'العميل' : 'Customer'}</th>
              <th>{isArabic ? 'تفاصيل المنتج' : 'Product Details'}</th>
              <th>{isArabic ? 'الدولة' : 'Country'}</th>
              <th>{isArabic ? 'قيمة المنتج' : 'Product Value'}</th>
              <th>{isArabic ? 'الحالة' : 'Status'}</th>
              <th>{isArabic ? 'ملاحظات' : 'Notes'}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(o => (
              <tr key={o.id}>
                <td>{o.order_number}</td>
                <td>
                  {o.customer_name}<br />
                  <small>{o.customer_phone}</small>
                  {o.customer_email && <><br /><small>{o.customer_email}</small></>}
                </td>
                <td className="order-product-cell">
                  {(o.items || []).length ? (o.items || []).map(item => {
                    const meta = itemMeta(item, isArabic);
                    return (
                      <div className="order-product-item" key={item.id}>
                        <strong>{itemName(item, isArabic)}</strong>
                        <span>
                          {isArabic ? 'الكمية' : 'Qty'}: {item.quantity} | {isArabic ? 'سعر القطعة' : 'Unit'}: ${Number(item.unit_price || 0).toFixed(2)} | {isArabic ? 'المجموع' : 'Total'}: ${Number(item.total || 0).toFixed(2)}
                        </span>
                        {meta && <small>{meta}</small>}
                      </div>
                    );
                  }) : '-'}
                </td>
                <td>{o.country || '-'}</td>
                <td>${Number(o.total || 0).toFixed(2)}</td>
                <td>
                  <select value={o.status} onChange={e => update(o.id, e.target.value)}>
                    {statuses.map(s => <option key={s} value={s}>{statusLabels[s]}</option>)}
                  </select>
                </td>
                <td>{o.notes || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!filtered.length && (
        <p className="muted">{isArabic ? 'لا توجد طلبات مطابقة.' : 'No matching requests.'}</p>
      )}

      <div className="actions-row">
        <button className="icon-btn" disabled={!canPrev} onClick={() => load(Math.max(page.offset - page.limit, 0))}>
          {isArabic ? 'السابق' : 'Prev'}
        </button>
        <span>{page.total ? page.offset + 1 : 0}-{Math.min(page.offset + page.limit, page.total)} / {page.total}</span>
        <button className="icon-btn" disabled={!canNext} onClick={() => load(page.offset + page.limit)}>
          {isArabic ? 'التالي' : 'Next'}
        </button>
      </div>
    </div>
  );
}
