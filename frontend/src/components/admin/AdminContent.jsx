import { useEffect, useMemo, useState } from 'react';
import api from '../../services/api.js';
import { useLanguage } from '../../context/LanguageContext.jsx';

const settingKeys = [
  'facebook_url',
  'instagram_url',
  'tiktok_url',
  'whatsapp_phone',
  'contact_phone',
  'contact_email'
];

const pageSlugs = [
  'home',
  'about',
  'accessories',
  'links',
  'return-policy',
  'shipping',
  'packaging',
  'after-sales',
  'contact'
];

const homeBlockKeys = [
  'home.hero.title',
  'home.hero.subtitle',
  'home.hero.cta',
  'home.policy.shipping.body',
  'home.policy.returns.body',
  'home.policy.afterSales.body'
];

function normalize(rows) {
  const out = {};
  for (const r of rows || []) {
    let json = r.value_json;
    if (typeof json === 'string') {
      try { json = JSON.parse(json); } catch { json = null; }
    }
    out[r.setting_key] = json?.url || r.value_ar || r.value_en || '';
  }
  return out;
}

function emptyPage(slug) {
  return {
    slug,
    title_ar: '',
    title_en: '',
    meta_title_ar: '',
    meta_title_en: '',
    meta_description_ar: '',
    meta_description_en: '',
    is_active: true
  };
}

function defaultBlockKeys(slug) {
  if (slug === 'home') return homeBlockKeys;
  return [`${slug}.body`];
}

function makeBlock(blockKey, pageId) {
  return {
    page_id: pageId || null,
    block_key: blockKey,
    block_type: 'text',
    content_ar: '',
    content_en: ''
  };
}

function t(isArabic, ar, en) {
  return isArabic ? ar : en;
}

export default function AdminContent() {
  const { lang } = useLanguage();
  const isArabic = lang === 'ar';
  const labels = useMemo(() => ({
    facebook_url: 'Facebook',
    instagram_url: 'Instagram',
    tiktok_url: 'TikTok',
    whatsapp_phone: t(isArabic, 'رقم واتساب', 'WhatsApp phone'),
    contact_phone: t(isArabic, 'رقم التواصل', 'Contact phone'),
    contact_email: t(isArabic, 'بريد التواصل', 'Contact email')
  }), [isArabic]);

  const [settings, setSettings] = useState({});
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [slug, setSlug] = useState('home');
  const [page, setPage] = useState(emptyPage('home'));
  const [blocks, setBlocks] = useState([]);

  async function loadSettings() {
    const r = await api.get('/content/settings');
    setSettings(normalize(r.data.settings));
  }

  async function loadPage(nextSlug = slug) {
    const { data } = await api.get(`/content/pages/${nextSlug}`);
    const nextPage = { ...emptyPage(nextSlug), ...(data.page || {}) };
    const existing = data.blocks || [];
    const map = new Map(existing.map(b => [b.block_key, b]));
    for (const key of defaultBlockKeys(nextSlug)) {
      if (!map.has(key)) map.set(key, makeBlock(key, nextPage.id));
    }
    setPage(nextPage);
    setBlocks([...map.values()].sort((a, b) => a.block_key.localeCompare(b.block_key)));
  }

  useEffect(() => { loadSettings().catch(() => setError(t(isArabic, 'تعذر تحميل الإعدادات', 'Unable to load settings'))); }, [isArabic]);
  useEffect(() => { loadPage(slug).catch(() => setError(t(isArabic, 'تعذر تحميل محتوى الصفحة', 'Unable to load page content'))); }, [slug, isArabic]);

  function setPageField(field, value) {
    setPage(current => ({ ...current, [field]: value }));
  }

  function setBlock(i, key, value) {
    setBlocks(prev => prev.map((b, idx) => idx === i ? { ...b, [key]: value } : b));
  }

  function addBlock() {
    setBlocks(prev => [
      ...prev,
      makeBlock(`${slug}.custom.${Date.now()}`, page?.id)
    ]);
  }

  async function saveSettings(e) {
    e.preventDefault();
    setSaved(false);
    setError('');
    try {
      for (const k of settingKeys) {
        await api.put('/content/settings', {
          setting_key: k,
          value_ar: k.includes('url') ? null : settings[k] || '',
          value_en: k.includes('url') ? null : settings[k] || '',
          value_json: k.includes('url') ? { url: settings[k] || '' } : null
        });
      }
      setSaved(true);
    } catch (err) {
      setError(err.response?.data?.message || t(isArabic, 'تعذر حفظ الإعدادات', 'Unable to save settings'));
    }
  }

  async function deleteSetting(key) {
    if (!confirm(t(isArabic, 'هل تريد حذف هذا الإعداد؟', 'Delete this setting?'))) return;
    setSaved(false);
    setError('');
    try {
      await api.delete(`/content/settings/${encodeURIComponent(key)}`);
      setSettings(current => ({ ...current, [key]: '' }));
      setSaved(true);
    } catch (err) {
      setError(err.response?.data?.message || t(isArabic, 'تعذر حذف الإعداد', 'Unable to delete setting'));
    }
  }

  async function savePageRecord(e) {
    if (e) e.preventDefault();
    setSaved(false);
    setError('');
    try {
      const payload = {
        slug,
        title_ar: page.title_ar || slug,
        title_en: page.title_en || slug,
        meta_title_ar: page.meta_title_ar || page.title_ar || slug,
        meta_title_en: page.meta_title_en || page.title_en || slug,
        meta_description_ar: page.meta_description_ar || '',
        meta_description_en: page.meta_description_en || '',
        is_active: page.is_active !== false
      };
      const { data } = await api.put('/content/pages', payload);
      const nextPage = data.page || { ...payload, id: page.id };
      setPage(nextPage);
      setSaved(true);
      return nextPage;
    } catch (err) {
      setError(err.response?.data?.message || t(isArabic, 'تعذر حفظ الصفحة', 'Unable to save page'));
      throw err;
    }
  }

  async function deletePage() {
    if (!page?.id) return;
    if (!confirm(t(isArabic, 'سيتم حذف نسخة المحتوى القابلة للتعديل لهذه الصفحة والبلوكات التابعة لها. هل تريد المتابعة؟', 'This deletes the editable page content and its blocks. Continue?'))) return;
    setSaved(false);
    setError('');
    try {
      await api.delete(`/content/pages/${encodeURIComponent(slug)}`);
      setPage(emptyPage(slug));
      setBlocks(defaultBlockKeys(slug).map(key => makeBlock(key, null)));
      setSaved(true);
    } catch (err) {
      setError(err.response?.data?.message || t(isArabic, 'تعذر حذف الصفحة', 'Unable to delete page'));
    }
  }

  async function saveBlocks(e) {
    e.preventDefault();
    setSaved(false);
    setError('');
    try {
      const savedPage = page?.id ? page : await savePageRecord();
      await api.put('/content/blocks/batch', {
        blocks: blocks
          .filter(block => block.block_key?.trim())
          .map(block => ({
            page_id: savedPage?.id || null,
            block_key: block.block_key.trim(),
            block_type: block.block_type || 'text',
            content_ar: block.content_ar || '',
            content_en: block.content_en || ''
          }))
      });
      await loadPage(slug);
      setSaved(true);
    } catch (err) {
      setError(err.response?.data?.message || t(isArabic, 'تعذر حفظ المحتوى', 'Unable to save content'));
    }
  }

  async function deleteBlock(block, index) {
    if (!block?.id) {
      setBlocks(prev => prev.filter((_, i) => i !== index));
      return;
    }
    if (!confirm(t(isArabic, 'هل تريد حذف هذا البلوك؟', 'Delete this block?'))) return;
    setSaved(false);
    setError('');
    try {
      await api.delete(`/content/blocks/${encodeURIComponent(block.block_key)}`);
      await loadPage(slug);
      setSaved(true);
    } catch (err) {
      setError(err.response?.data?.message || t(isArabic, 'تعذر حذف البلوك', 'Unable to delete block'));
    }
  }

  return (
    <div>
      <h2>{t(isArabic, 'المحتوى والإعدادات', 'Content & Settings')}</h2>
      {saved && <p className="success-box">{t(isArabic, 'تم الحفظ', 'Saved')}</p>}
      {error && <p className="error-box">{error}</p>}

      <form onSubmit={saveSettings} className="admin-form card">
        <h3>{t(isArabic, 'الإعدادات العامة', 'General Settings')}</h3>
        <div className="admin-grid">
          {settingKeys.map(k => (
            <label key={k}>
              {labels[k]}
              <span className="admin-inline-control">
                <input value={settings[k] || ''} onChange={e => setSettings({ ...settings, [k]: e.target.value })} />
                <button type="button" className="icon-btn" onClick={() => deleteSetting(k)}>
                  {t(isArabic, 'حذف', 'Delete')}
                </button>
              </span>
            </label>
          ))}
        </div>
        <button className="btn">{t(isArabic, 'حفظ الإعدادات', 'Save settings')}</button>
      </form>

      <form onSubmit={savePageRecord} className="admin-form card" style={{ marginTop: '1rem' }}>
        <h3>{t(isArabic, 'بيانات الصفحة', 'Page details')}</h3>
        <label>
          {t(isArabic, 'الصفحة', 'Page')}
          <select value={slug} onChange={e => setSlug(e.target.value)}>
            {pageSlugs.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <div className="admin-grid">
          <label>{t(isArabic, 'العنوان العربي', 'Arabic title')}<input value={page.title_ar || ''} onChange={e => setPageField('title_ar', e.target.value)} /></label>
          <label>{t(isArabic, 'العنوان الإنجليزي', 'English title')}<input value={page.title_en || ''} onChange={e => setPageField('title_en', e.target.value)} /></label>
          <label>{t(isArabic, 'Meta عربي', 'Arabic meta title')}<input value={page.meta_title_ar || ''} onChange={e => setPageField('meta_title_ar', e.target.value)} /></label>
          <label>{t(isArabic, 'Meta إنجليزي', 'English meta title')}<input value={page.meta_title_en || ''} onChange={e => setPageField('meta_title_en', e.target.value)} /></label>
          <label>{t(isArabic, 'وصف الصفحة العربي', 'Arabic page intro')}<textarea value={page.meta_description_ar || ''} onChange={e => setPageField('meta_description_ar', e.target.value)} /></label>
          <label>{t(isArabic, 'وصف الصفحة الإنجليزي', 'English page intro')}<textarea value={page.meta_description_en || ''} onChange={e => setPageField('meta_description_en', e.target.value)} /></label>
          <label className="checkbox-row">
            <input type="checkbox" checked={page.is_active !== false} onChange={e => setPageField('is_active', e.target.checked)} />
            {t(isArabic, 'مفعلة', 'Active')}
          </label>
        </div>
        <div className="actions-row">
          <button className="btn">{t(isArabic, 'حفظ بيانات الصفحة', 'Save page details')}</button>
          <button type="button" className="btn ghost" disabled={!page?.id} onClick={deletePage}>
            {t(isArabic, 'حذف محتوى الصفحة', 'Delete page content')}
          </button>
        </div>
      </form>

      <form onSubmit={saveBlocks} className="admin-form card" style={{ marginTop: '1rem' }}>
        <h3>{t(isArabic, 'بلوكات الصفحة', 'Editable page blocks')}</h3>
        {blocks.map((b, i) => (
          <div key={`${b.block_key}-${i}`} className="card admin-content-block">
            <div className="admin-grid">
              <label>{t(isArabic, 'مفتاح البلوك', 'Block key')}<input value={b.block_key || ''} onChange={e => setBlock(i, 'block_key', e.target.value)} /></label>
              <label>
                {t(isArabic, 'النوع', 'Type')}
                <select value={b.block_type || 'text'} onChange={e => setBlock(i, 'block_type', e.target.value)}>
                  <option value="text">text</option>
                  <option value="html">html</option>
                  <option value="hero">hero</option>
                  <option value="cta">cta</option>
                  <option value="faq">faq</option>
                </select>
              </label>
              <label>{t(isArabic, 'المحتوى العربي', 'Arabic content')}<textarea value={b.content_ar || ''} onChange={e => setBlock(i, 'content_ar', e.target.value)} /></label>
              <label>{t(isArabic, 'المحتوى الإنجليزي', 'English content')}<textarea value={b.content_en || ''} onChange={e => setBlock(i, 'content_en', e.target.value)} /></label>
            </div>
            <button type="button" className="icon-btn" onClick={() => deleteBlock(b, i)}>
              {t(isArabic, 'حذف البلوك', 'Delete block')}
            </button>
          </div>
        ))}
        <div className="actions-row">
          <button type="button" className="btn ghost" onClick={addBlock}>{t(isArabic, 'إضافة بلوك', 'Add block')}</button>
          <button className="btn">{t(isArabic, 'حفظ محتوى الصفحة', 'Save page content')}</button>
        </div>
      </form>
    </div>
  );
}
