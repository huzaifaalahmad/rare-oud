import { useEffect, useMemo, useState } from 'react';
import api from '../../services/api.js';
import { useLanguage } from '../../context/LanguageContext.jsx';

function t(isArabic, ar, en) {
  return isArabic ? ar : en;
}

function parseCountries(value) {
  if (Array.isArray(value)) return value.map(v => String(v).trim().toUpperCase()).filter(Boolean);
  if (!value) return [];
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parseCountries(parsed);
    } catch {}
    return value.split(',').map(v => v.trim().toUpperCase()).filter(Boolean);
  }
  return [];
}

const emptyZone = { id: null, name_ar: '', name_en: '', countries: 'SY', is_active: true };
const emptyRate = { id: null, zone_id: '', rate: 0, min_weight: 0, max_weight: 9999 };

export default function AdminShipping() {
  const { lang } = useLanguage();
  const isArabic = lang === 'ar';
  const [zones, setZones] = useState([]);
  const [rates, setRates] = useState([]);
  const [zone, setZone] = useState(emptyZone);
  const [rate, setRate] = useState(emptyRate);
  const [state, setState] = useState({ loading: true, error: '', success: '' });

  const zonesById = useMemo(() => new Map(zones.map(z => [String(z.id), z])), [zones]);

  async function load() {
    setState(current => ({ ...current, loading: true, error: '' }));
    const { data } = await api.get('/admin/shipping');
    setZones(data.zones || []);
    setRates(data.rates || []);
    setState(current => ({ ...current, loading: false }));
  }

  useEffect(() => {
    load().catch(error => setState({
      loading: false,
      error: error.response?.data?.message || t(isArabic, 'تعذر تحميل إعدادات الشحن.', 'Unable to load shipping settings.'),
      success: ''
    }));
  }, [isArabic]);

  function countryLabel(value) {
    const countries = parseCountries(value);
    return countries.length ? countries.join(', ') : '-';
  }

  async function saveZone(e) {
    e.preventDefault();
    const countries = parseCountries(zone.countries);
    if (!zone.name_ar.trim() || !zone.name_en.trim() || !countries.length) {
      setState({ loading: false, error: t(isArabic, 'أدخل اسم المنطقة بالعربي والإنكليزي مع بلد واحد على الأقل.', 'Enter Arabic/English zone names and at least one country.'), success: '' });
      return;
    }

    setState({ loading: false, error: '', success: '' });
    await api.put('/admin/shipping/zones', {
      ...zone,
      countries,
      is_active: Boolean(zone.is_active)
    });
    setZone(emptyZone);
    setState({ loading: false, error: '', success: t(isArabic, 'تم حفظ منطقة الشحن.', 'Shipping zone saved.') });
    await load();
  }

  async function saveRate(e) {
    e.preventDefault();
    if (!rate.zone_id) {
      setState({ loading: false, error: t(isArabic, 'اختر منطقة الشحن أولاً.', 'Choose a shipping zone first.'), success: '' });
      return;
    }

    setState({ loading: false, error: '', success: '' });
    await api.put('/admin/shipping/rates', {
      ...rate,
      zone_id: Number(rate.zone_id),
      rate: Number(rate.rate),
      min_weight: Number(rate.min_weight),
      max_weight: Number(rate.max_weight)
    });
    setRate(emptyRate);
    setState({ loading: false, error: '', success: t(isArabic, 'تم حفظ سعر الشحن.', 'Shipping rate saved.') });
    await load();
  }

  function editZone(item) {
    setZone({
      id: item.id,
      name_ar: item.name_ar || '',
      name_en: item.name_en || '',
      countries: countryLabel(item.countries),
      is_active: Boolean(item.is_active)
    });
  }

  function editRate(item) {
    setRate({
      id: item.id,
      zone_id: String(item.zone_id || ''),
      rate: Number(item.rate || 0),
      min_weight: Number(item.min_weight || 0),
      max_weight: Number(item.max_weight || 9999)
    });
  }

  async function deleteZone(id) {
    if (!confirm(t(isArabic, 'حذف منطقة الشحن؟', 'Delete shipping zone?'))) return;
    try {
      await api.delete(`/admin/shipping/zones/${id}`);
      await load();
    } catch (err) {
      setState({ loading: false, error: err.response?.data?.message || t(isArabic, 'تعذر حذف المنطقة. احذف الأسعار المرتبطة بها أولاً.', 'Unable to delete zone. Remove linked rates first.'), success: '' });
    }
  }

  async function deleteRate(id) {
    if (!confirm(t(isArabic, 'حذف سعر الشحن؟', 'Delete shipping rate?'))) return;
    try {
      await api.delete(`/admin/shipping/rates/${id}`);
      await load();
    } catch (err) {
      setState({ loading: false, error: err.response?.data?.message || t(isArabic, 'تعذر حذف سعر الشحن.', 'Unable to delete rate.'), success: '' });
    }
  }

  return (
    <div className="admin-stack admin-shipping">
      <div className="admin-header-row">
        <div>
          <h2>{t(isArabic, 'الشحن', 'Shipping')}</h2>
          <p className="muted">{t(isArabic, 'إدارة مناطق الشحن والأسعار حسب الوزن مع جاهزية للتوسع الدولي.', 'Manage shipping zones and weight-based rates with international readiness.')}</p>
        </div>
      </div>

      {state.error && <p className="error-box">{state.error}</p>}
      {state.success && <p className="success-box">{state.success}</p>}

      <div className="admin-summary-grid">
        <article className="card">
          <strong>{zones.length}</strong>
          <span>{t(isArabic, 'مناطق الشحن', 'Shipping zones')}</span>
        </article>
        <article className="card">
          <strong>{rates.length}</strong>
          <span>{t(isArabic, 'أسعار فعالة', 'Active rates')}</span>
        </article>
      </div>

      <div className="admin-two-panel">
        <form className="admin-form card" onSubmit={saveZone}>
          <h3>{zone.id ? t(isArabic, 'تعديل منطقة', 'Edit zone') : t(isArabic, 'منطقة جديدة', 'New zone')}</h3>
          <div className="admin-grid">
            <label>{t(isArabic, 'الاسم العربي', 'Arabic name')}<input value={zone.name_ar} onChange={e => setZone({ ...zone, name_ar: e.target.value })} required /></label>
            <label>{t(isArabic, 'الاسم الإنكليزي', 'English name')}<input value={zone.name_en} onChange={e => setZone({ ...zone, name_en: e.target.value })} required /></label>
            <label>{t(isArabic, 'رموز الدول', 'Country codes')}<input value={zone.countries} onChange={e => setZone({ ...zone, countries: e.target.value })} placeholder="SY, AE, SA" required /></label>
            <label className="checkbox-row"><input type="checkbox" checked={zone.is_active} onChange={e => setZone({ ...zone, is_active: e.target.checked })} /> {t(isArabic, 'مفعلة', 'Active')}</label>
          </div>
          <div className="actions-row">
            <button className="btn">{zone.id ? t(isArabic, 'حفظ التعديل', 'Save changes') : t(isArabic, 'حفظ المنطقة', 'Save zone')}</button>
            {zone.id && <button type="button" className="icon-btn" onClick={() => setZone(emptyZone)}>{t(isArabic, 'إلغاء', 'Cancel')}</button>}
          </div>
        </form>

        <form className="admin-form card" onSubmit={saveRate}>
          <h3>{rate.id ? t(isArabic, 'تعديل سعر', 'Edit rate') : t(isArabic, 'سعر شحن جديد', 'New rate')}</h3>
          <div className="admin-grid">
            <label>{t(isArabic, 'المنطقة', 'Zone')}<select value={rate.zone_id} onChange={e => setRate({ ...rate, zone_id: e.target.value })} required><option value="">{t(isArabic, 'اختر', 'Select')}</option>{zones.map(z => <option key={z.id} value={z.id}>{z.name_ar} / {z.name_en}</option>)}</select></label>
            <label>{t(isArabic, 'السعر', 'Rate')}<input type="number" min="0" step="0.01" value={rate.rate} onChange={e => setRate({ ...rate, rate: e.target.value })} /></label>
            <label>{t(isArabic, 'أقل وزن', 'Min weight')}<input type="number" min="0" step="0.01" value={rate.min_weight} onChange={e => setRate({ ...rate, min_weight: e.target.value })} /></label>
            <label>{t(isArabic, 'أعلى وزن', 'Max weight')}<input type="number" min="0" step="0.01" value={rate.max_weight} onChange={e => setRate({ ...rate, max_weight: e.target.value })} /></label>
          </div>
          <div className="actions-row">
            <button className="btn">{rate.id ? t(isArabic, 'حفظ التعديل', 'Save changes') : t(isArabic, 'حفظ السعر', 'Save rate')}</button>
            {rate.id && <button type="button" className="icon-btn" onClick={() => setRate(emptyRate)}>{t(isArabic, 'إلغاء', 'Cancel')}</button>}
          </div>
        </form>
      </div>

      {state.loading ? <p className="muted">{t(isArabic, 'جاري التحميل...', 'Loading...')}</p> : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>{t(isArabic, 'المنطقة', 'Zone')}</th><th>{t(isArabic, 'الدول', 'Countries')}</th><th>{t(isArabic, 'الحالة', 'Status')}</th><th>{t(isArabic, 'إجراءات', 'Actions')}</th></tr></thead>
            <tbody>{zones.map(z => <tr key={z.id}><td><strong>{z.name_ar}</strong><br /><small>{z.name_en}</small></td><td>{countryLabel(z.countries)}</td><td><span className="status-pill">{z.is_active ? t(isArabic, 'مفعلة', 'Active') : t(isArabic, 'موقوفة', 'Paused')}</span></td><td className="admin-table-actions"><button className="icon-btn" onClick={() => editZone(z)}>{t(isArabic, 'تعديل', 'Edit')}</button><button className="icon-btn" onClick={() => deleteZone(z.id)}>{t(isArabic, 'حذف', 'Delete')}</button></td></tr>)}</tbody>
          </table>

          <table className="table">
            <thead><tr><th>{t(isArabic, 'المنطقة', 'Zone')}</th><th>{t(isArabic, 'السعر', 'Rate')}</th><th>{t(isArabic, 'الوزن', 'Weight')}</th><th>{t(isArabic, 'إجراءات', 'Actions')}</th></tr></thead>
            <tbody>{rates.map(item => {
              const itemZone = zonesById.get(String(item.zone_id));
              return <tr key={item.id}><td>{itemZone ? `${itemZone.name_ar} / ${itemZone.name_en}` : item.zone_id}</td><td>${Number(item.rate || 0).toFixed(2)}</td><td>{item.min_weight} - {item.max_weight}</td><td className="admin-table-actions"><button className="icon-btn" onClick={() => editRate(item)}>{t(isArabic, 'تعديل', 'Edit')}</button><button className="icon-btn" onClick={() => deleteRate(item.id)}>{t(isArabic, 'حذف', 'Delete')}</button></td></tr>;
            })}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}
