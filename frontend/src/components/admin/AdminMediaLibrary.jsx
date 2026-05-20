import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, Image as ImageIcon } from 'lucide-react';
import api from '../../services/api.js';
import { useLanguage } from '../../context/LanguageContext.jsx';
import { mediaUrl } from '../../utils/media.js';

function t(isArabic, ar, en) {
  return isArabic ? ar : en;
}

export default function AdminMediaLibrary() {
  const { lang } = useLanguage();
  const isArabic = lang === 'ar';
  const [images, setImages] = useState([]);
  const [state, setState] = useState({ loading: true, error: '' });

  useEffect(() => {
    let active = true;
    setState({ loading: true, error: '' });
    api.get('/admin/media')
      .then(({ data }) => {
        if (!active) return;
        setImages(data.images || []);
        setState({ loading: false, error: '' });
      })
      .catch(error => {
        if (!active) return;
        setState({ loading: false, error: error.response?.data?.message || error.message });
      });

    return () => {
      active = false;
    };
  }, []);

  const stats = useMemo(() => ({
    total: images.length,
    primary: images.filter(img => img.is_primary).length
  }), [images]);

  return (
    <div className="admin-stack admin-media-library">
      <div className="admin-header-row">
        <div>
          <h2>{t(isArabic, 'مكتبة الوسائط', 'Media Library')}</h2>
          <p className="muted">{t(isArabic, 'كل صور المنتجات المرفوعة مع المنتج المرتبط وحالة الصورة الأساسية.', 'All uploaded product images with their linked product and primary-image state.')}</p>
        </div>
      </div>

      {state.error && <div className="error-box">{state.error}</div>}

      <div className="admin-summary-grid">
        <article className="card"><strong>{stats.total}</strong><span>{t(isArabic, 'صور المنتجات', 'Product images')}</span></article>
        <article className="card"><strong>{stats.primary}</strong><span>{t(isArabic, 'صور أساسية', 'Primary images')}</span></article>
      </div>

      {state.loading ? <p className="muted">{t(isArabic, 'جاري تحميل الوسائط...', 'Loading media...')}</p> : (
        <>
          {!images.length && (
            <div className="card empty-admin-state">
              <ImageIcon size={28} />
              <strong>{t(isArabic, 'لا توجد صور بعد', 'No images yet')}</strong>
              <span className="muted">{t(isArabic, 'ارفع صور المنتجات من قسم المنتجات، وستظهر هنا تلقائياً.', 'Upload product images from Products and they will appear here automatically.')}</span>
            </div>
          )}

          <div className="media-grid">
            {images.map(img => {
              const src = mediaUrl(img.image_url);
              return (
                <article className="card media-card" key={img.id}>
                  <img loading="lazy" decoding="async" src={src} alt={img.alt_en || img.name_en || 'Rare Oud image'} />
                  <div>
                    <strong>{isArabic ? (img.name_ar || img.name_en) : (img.name_en || img.name_ar)}</strong>
                    <span className="status-pill">{img.is_primary ? t(isArabic, 'أساسية', 'Primary') : t(isArabic, 'معرض', 'Gallery')}</span>
                    <small>{img.image_url}</small>
                    <a className="text-link media-open-link" href={src} target="_blank" rel="noreferrer">
                      <ExternalLink size={15} /> {t(isArabic, 'فتح الصورة', 'Open image')}
                    </a>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
