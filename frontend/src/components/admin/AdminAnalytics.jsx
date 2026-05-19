import { useEffect, useState } from 'react';
import { useLanguage } from '../../context/LanguageContext.jsx';
import api from '../../services/api.js';

export default function AdminAnalytics() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const { lang } = useLanguage();
  const isArabic = lang === 'ar';

  useEffect(() => {
    api.get('/admin/analytics')
      .then(r => setData(r.data))
      .catch(e => setErr(e.response?.data?.message || e.message));
  }, []);

  if (err) return <div className="error-box">{err}</div>;
  if (!data) {
    return (
      <div className="card" style={{ padding: '1rem' }}>
        {isArabic ? 'جاري تحميل التحليلات...' : 'Loading analytics...'}
      </div>
    );
  }

  const cards = [
    [isArabic ? 'الإيرادات' : 'Revenue', `$${Number(data.sales?.revenue || 0).toFixed(2)}`],
    [isArabic ? 'الطلبات' : 'Orders', data.sales?.orders_count || 0],
    [isArabic ? 'بانتظار المعالجة' : 'Pending', data.sales?.pending_orders || 0],
    [isArabic ? 'المنتجات' : 'Products', data.products?.total_products || 0],
    [isArabic ? 'نفد المخزون' : 'Out of stock', data.products?.out_of_stock || 0],
    [isArabic ? 'المستخدمون' : 'Users', data.users?.total_users || 0],
    [isArabic ? 'تقييمات بانتظار الموافقة' : 'Pending reviews', data.reviews?.pending_reviews || 0],
    [isArabic ? 'طلبات التخصيص' : 'Custom orders', data.customOrders?.open_custom_orders || 0]
  ];

  return (
    <div>
      <h2>{isArabic ? 'التحليلات' : 'Analytics'}</h2>
      <div className="admin-kpi-grid">
        {cards.map(([k, v]) => (
          <div className="stat" key={k}>
            <span>{k}</span>
            <strong>{v}</strong>
          </div>
        ))}
      </div>

      <h3>{isArabic ? 'أحدث الطلبات' : 'Recent orders'}</h3>
      <div className="table-wrap">
        <table className="table">
          <tbody>
            {(data.recentOrders || []).map(o => (
              <tr key={o.id}>
                <td>{o.order_number}</td>
                <td>{o.status}</td>
                <td>${o.total}</td>
                <td>{new Date(o.created_at).toLocaleString(isArabic ? 'ar' : 'en')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3>{isArabic ? 'سجل النشاط' : 'Activity timeline'}</h3>
      <div className="activity-list">
        {(data.activity || []).map(a => (
          <div className="activity-item" key={a.id}>
            <strong>{a.action}</strong>
            <span>{a.entity_type} #{a.entity_id}</span>
            <small>
              {a.admin_name || (isArabic ? 'النظام' : 'System')} · {new Date(a.created_at).toLocaleString(isArabic ? 'ar' : 'en')}
            </small>
          </div>
        ))}
      </div>
    </div>
  );
}
