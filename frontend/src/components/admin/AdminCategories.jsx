import { useEffect, useState } from 'react';
import { useLanguage } from '../../context/LanguageContext.jsx';
import api from '../../services/api.js';

const empty = {
  slug: '',
  name_ar: '',
  name_en: '',
  description_ar: '',
  description_en: '',
  sort_order: 0,
  is_active: true
};

export default function AdminCategories() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState('');
  const { lang } = useLanguage();
  const isArabic = lang === 'ar';

  async function load() {
    const { data } = await api.get('/categories');
    setItems(data.categories || []);
  }

  useEffect(() => {
    load().catch(() => setError(isArabic ? 'تعذر تحميل التصنيفات' : 'Failed to load categories'));
  }, [isArabic]);

  async function save(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/categories', { ...form, sort_order: Number(form.sort_order) });
      setForm(empty);
      load();
    } catch (err) {
      setError(err.response?.data?.message || (isArabic ? 'تعذر حفظ التصنيف' : 'Failed to save category'));
    }
  }

  async function remove(id) {
    await api.delete(`/categories/${id}`);
    load();
  }

  return (
    <div>
      <h2>{isArabic ? 'التصنيفات' : 'Categories'}</h2>
      {error && <p className="error-box">{error}</p>}

      <form className="card admin-form" onSubmit={save}>
        <div className="admin-grid">
          <label>{isArabic ? 'المعرّف' : 'Slug'}<input required value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} /></label>
          <label>{isArabic ? 'الاسم العربي' : 'Name AR'}<input required value={form.name_ar} onChange={e => setForm({ ...form, name_ar: e.target.value })} /></label>
          <label>{isArabic ? 'الاسم الإنجليزي' : 'Name EN'}<input required value={form.name_en} onChange={e => setForm({ ...form, name_en: e.target.value })} /></label>
          <label>{isArabic ? 'الترتيب' : 'Order'}<input type="number" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: e.target.value })} /></label>
          <label>{isArabic ? 'الوصف العربي' : 'Description AR'}<textarea value={form.description_ar} onChange={e => setForm({ ...form, description_ar: e.target.value })} /></label>
          <label>{isArabic ? 'الوصف الإنجليزي' : 'Description EN'}<textarea value={form.description_en} onChange={e => setForm({ ...form, description_en: e.target.value })} /></label>
        </div>

        <button className="btn">{isArabic ? 'إضافة تصنيف' : 'Add Category'}</button>
      </form>

      <div className="table-wrap">
        <table className="table">
          <tbody>
            {items.map(c => (
              <tr key={c.id}>
                <td>{c.slug}</td>
                <td>{c.name_ar}</td>
                <td>{c.name_en}</td>
                <td>
                  <button className="icon-btn" onClick={() => remove(c.id)}>
                    {isArabic ? 'تعطيل' : 'Disable'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
