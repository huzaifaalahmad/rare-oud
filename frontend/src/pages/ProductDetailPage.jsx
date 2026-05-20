import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Heart, MessageCircle, Music2, PlayCircle, Send, Star } from 'lucide-react';
import api from '../services/api.js';
import { useLanguage } from '../context/LanguageContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import SEO from '../components/seo/SEO.jsx';
import { mediaUrl } from '../utils/media.js';

function cleanDriveUrl(url) {
  if (!url) return '';
  const raw = String(url).trim();
  const match = raw.match(/\/d\/([^/]+)/) || raw.match(/[?&]id=([^&]+)/);
  return match ? `https://drive.google.com/file/d/${match[1]}/view` : raw;
}

export default function ProductDetailPage() {
  const { id } = useParams();
  const [state, setState] = useState({ loading: true, error: '', data: null });
  const [favorite, setFavorite] = useState({ known: false, value: false, count: 0, message: '' });
  const [selectedImage, setSelectedImage] = useState('');
  const [orderOpen, setOrderOpen] = useState(false);
  const [order, setOrder] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    country: '',
    notes: '',
    quantity: 1,
    saving: false,
    message: ''
  });
  const [review, setReview] = useState({ rating: 5, comment: '', saving: false, message: '' });
  const { lang, tr } = useLanguage();
  const { user } = useAuth();
  const isArabic = lang === 'ar';

  useEffect(() => {
    let mounted = true;
    setState({ loading: true, error: '', data: null });

    api.get(`/products/${id}`)
      .then(r => mounted && setState({ loading: false, error: '', data: r.data }))
      .catch(() => mounted && setState({
        loading: false,
        error: isArabic ? 'تعذر تحميل المنتج' : 'Unable to load product',
        data: null
      }));

    return () => { mounted = false; };
  }, [id, isArabic]);

  useEffect(() => {
    if (state.data?.product) {
      setSelectedImage(state.data.product.primary_image || state.data.images?.[0]?.image_url || '');
    }
  }, [state.data?.product?.id, state.data?.product?.primary_image, state.data?.images]);

  useEffect(() => {
    if (!state.data?.product) return;
    setFavorite(f => ({ ...f, count: Number(state.data.product.likes_count || 0) }));

    if (user) {
      api.get(`/favorites/${state.data.product.id}/status`)
        .then(r => setFavorite(f => ({
          ...f,
          known: true,
          value: Boolean(r.data.favorited),
          count: Number(r.data.likes_count || f.count)
        })))
        .catch(() => {});
    }
  }, [state.data?.product, user?.id]);

  const settingsPromise = useMemo(
    () => api.get('/content/settings').catch(() => ({ data: { settings: {} } })),
    []
  );

  if (state.loading) {
    return <section className="section container">{isArabic ? 'جاري تحميل المنتج...' : 'Loading product...'}</section>;
  }

  if (state.error || !state.data?.product) {
    return <section className="section container"><h1>{state.error || 'Product not found'}</h1></section>;
  }

  const { product: p, images = [], media = [], reviews = [] } = state.data;
  const name = isArabic ? p.name_ar : p.name_en;
  const desc = isArabic ? p.description_ar : p.description_en;
  const wood = isArabic ? p.woods_ar : p.woods_en;
  const origin = isArabic ? p.origin_country_ar : p.origin_country_en;
  const maker = isArabic ? p.maker_identity_ar : p.maker_identity_en;
  const history = isArabic ? p.historical_geographic_classification_ar : p.historical_geographic_classification_en;
  const video = media.find(m => m.media_type === 'video');
  const audio = media.find(m => m.media_type === 'audio');
  const avg = Number(p.avg_rating || 0);
  const galleryImages = Array.from(new Set([p.primary_image, ...images.map(i => i.image_url)].filter(Boolean))).slice(0, 4);
  const activeImage = selectedImage || galleryImages[0] || p.primary_image || '';
  const gallerySlots = [...galleryImages, ...Array(Math.max(0, 4 - galleryImages.length)).fill('')].slice(0, 4);

  async function toggleFavorite() {
    if (!user) {
      setFavorite(f => ({
        ...f,
        message: isArabic ? 'سجّل الدخول لإضافة المنتج إلى المفضلة.' : 'Please login to add favorites.'
      }));
      return;
    }

    const { data } = await api.post(`/favorites/${p.id}/toggle`);
    setFavorite({
      known: true,
      value: data.favorited,
      count: Number(data.likes_count || 0),
      message: data.favorited
        ? (isArabic ? 'أضيف إلى المفضلة' : 'Added to favorites')
        : (isArabic ? 'تمت الإزالة من المفضلة' : 'Removed from favorites')
    });
  }

  async function whatsapp() {
    const { data } = await settingsPromise;
    const settingsArray = Array.isArray(data.settings) ? data.settings : Object.values(data.settings || {});
    const whatsappSetting = settingsArray.find(s => s.setting_key === 'whatsapp_phone') || {};
    const raw = (whatsappSetting.value_ar || whatsappSetting.value_en || '').replace(/\D/g, '');
    const text = encodeURIComponent(
      `${isArabic ? 'مرحباً، أريد الاستفسار عن' : 'Hello, I am interested in'} ${name}\n${window.location.href}\n${isArabic ? 'السعر التقريبي' : 'Indicative price'}: $${Number(p.price).toFixed(2)}`
    );
    window.open(`https://wa.me/${raw || '963000000000'}?text=${text}`, '_blank', 'noopener,noreferrer');
  }

  async function submitOrder(e) {
    e.preventDefault();
    const customerName = String(order.customer_name || '').trim();

    if (customerName.length < 2 || customerName.length > 140) {
      setOrder(o => ({ ...o, message: isArabic ? 'اكتب اسماً صحيحاً بين 2 و140 حرفاً.' : 'Enter a valid name between 2 and 140 characters.' }));
      return;
    }

    setOrder(o => ({ ...o, saving: true, message: '' }));

    try {
      const { data } = await api.post('/orders/direct', {
        product_id: p.id,
        quantity: order.quantity,
        customer_name: customerName,
        customer_email: order.customer_email,
        customer_phone: order.customer_phone,
        country: order.country,
        notes: order.notes
      });
      setOrder(o => ({ ...o, saving: false, message: isArabic ? `تم إرسال الطلب رقم ${data.order_number}.` : `Request ${data.order_number} sent.` }));
      setTimeout(() => setOrderOpen(false), 2500);
    } catch (err) {
      setOrder(o => ({
        ...o,
        saving: false,
        message: err.response?.data?.message || (isArabic ? 'تعذر إرسال الطلب' : 'Unable to send request')
      }));
    }
  }

  async function submitReview(e) {
    e.preventDefault();

    if (!user) {
      setReview(r => ({ ...r, message: isArabic ? 'سجّل الدخول لإضافة تقييم.' : 'Please login to review.' }));
      return;
    }

    setReview(r => ({ ...r, saving: true, message: '' }));

    try {
      await api.post(`/reviews/products/${p.id}`, { rating: review.rating, comment: review.comment });
      setReview({
        rating: 5,
        comment: '',
        saving: false,
        message: isArabic ? 'تم إرسال التقييم للمراجعة.' : 'Review submitted for approval.'
      });
    } catch (err) {
      setReview(r => ({
        ...r,
        saving: false,
        message: err.response?.data?.message || (isArabic ? 'تعذر إرسال التقييم' : 'Unable to submit review')
      }));
    }
  }

  return (
    <>
    <SEO title={name} description={desc} image={mediaUrl(activeImage || p.primary_image)} type="product" />
    <section className="section product-luxury-page">
      <div className="container product-detail-grid">
        <div className="card product-gallery">
          {activeImage ? (
            <img className="product-main-image" src={mediaUrl(activeImage)} alt={name} loading="eager" decoding="async" />
          ) : (
            <div className="product-main-image product-image-placeholder">
              <span>Rare Oud</span>
              <strong>{name}</strong>
            </div>
          )}
          <div className="gallery-count">
            {isArabic ? 'معرض من أربع زوايا' : 'Four-angle gallery'}
          </div>
          <div className="thumb-row four-up">
            {gallerySlots.map((imageUrl, index) => (
              imageUrl ? (
                <button
                  className={`thumb-button ${activeImage === imageUrl ? 'active' : ''}`}
                  key={imageUrl}
                  type="button"
                  onClick={() => setSelectedImage(imageUrl)}
                  aria-label={`${isArabic ? 'صورة' : 'Image'} ${index + 1}`}
                >
                  <img src={mediaUrl(imageUrl)} alt={`${name} ${index + 1}`} loading="lazy" decoding="async" />
                </button>
              ) : (
                <div className="thumb-placeholder" key={`placeholder-${index}`}>
                  <span>{index + 1}</span>
                </div>
              )
            ))}
          </div>
        </div>

        <div className="product-info-panel">
          <span className="eyebrow">{isArabic ? p.category_name_ar : p.category_name_en}</span>
          <h1 className="title">{name}</h1>
          <p className="muted luxury-copy">{desc}</p>
          <h2>${Number(p.price).toFixed(2)}</h2>
          <p>
            <Star size={16} fill="currentColor" /> {avg ? avg.toFixed(1) : '-'} / 5 · {reviews.length} {isArabic ? 'تقييمات' : 'reviews'} · <Heart size={16} /> {favorite.count}
          </p>

          <div className="meta-grid">
            <p><strong>{tr('stock')}:</strong> {p.stock > 0 ? (isArabic ? 'متوفر للتواصل' : 'Available for inquiry') : tr('outOfStock')}</p>
            <p><strong>{tr('condition')}:</strong> {p.condition_status === 'new' ? tr('new') : tr('used')}</p>
            <p><strong>{tr('wood')}:</strong> {wood || '-'}</p>
            <p><strong>{tr('origin')}:</strong> {origin || '-'}</p>
            <p><strong>{tr('maker')}:</strong> {maker || '-'}</p>
            <p><strong>{tr('dimensions')}:</strong> {p.dimensions || '-'}</p>
            {history && (
              <p><strong>{isArabic ? 'التصنيف التاريخي والجغرافي' : 'Historical / geographic class'}:</strong> {history}</p>
            )}
          </div>

          <div className="actions-row">
            <button className="btn" disabled={p.stock <= 0} type="button" onClick={() => setOrderOpen(v => !v)}>
              <Send size={18} /> {isArabic ? 'طلب المنتج' : 'Request Product'}
            </button>
            <button className="icon-btn" type="button" onClick={toggleFavorite}>
              <Heart size={18} fill={favorite.value ? 'currentColor' : 'none'} /> {isArabic ? 'مفضلة' : 'Favorite'}
            </button>
            <button className="icon-btn" type="button" onClick={whatsapp}>
              <MessageCircle size={18} /> {isArabic ? 'استفسار واتساب' : 'WhatsApp Inquiry'}
            </button>
          </div>

          <div className="product-media-actions">
            {video?.drive_url && (
              <a className="btn secondary" href={cleanDriveUrl(video.drive_url)} target="_blank" rel="noopener noreferrer">
                <PlayCircle size={18} /> {isArabic ? 'مشاهدة الفيديو' : 'Watch video'}
              </a>
            )}
            {audio?.drive_url && (
              <a className="btn secondary" href={cleanDriveUrl(audio.drive_url)} target="_blank" rel="noopener noreferrer">
                <Music2 size={18} /> {isArabic ? 'صوت العود' : 'Oud audio'}
              </a>
            )}
          </div>

          {favorite.message && (
            <p className="muted">
              {favorite.message} {!user && <Link to="/login">{tr('login')}</Link>}
            </p>
          )}

          {orderOpen && (
            <form className="card direct-order-form" onSubmit={submitOrder}>
              <h3>{isArabic ? 'طلب المنتج مباشرة' : 'Direct product request'}</h3>
              <div className="form-grid">
                <input required minLength="2" maxLength="140" placeholder={isArabic ? 'الاسم' : 'Name'} value={order.customer_name} onChange={e => setOrder(o => ({ ...o, customer_name: e.target.value }))} />
                <input placeholder={isArabic ? 'البريد الإلكتروني اختياري' : 'Email optional'} value={order.customer_email} onChange={e => setOrder(o => ({ ...o, customer_email: e.target.value }))} />
                <input required placeholder={isArabic ? 'رقم الهاتف' : 'Phone'} value={order.customer_phone} onChange={e => setOrder(o => ({ ...o, customer_phone: e.target.value }))} />
                <input placeholder={isArabic ? 'الدولة' : 'Country'} value={order.country} onChange={e => setOrder(o => ({ ...o, country: e.target.value }))} />
              </div>
              <textarea rows="3" placeholder={isArabic ? 'ملاحظات حول الطلب' : 'Notes'} value={order.notes} onChange={e => setOrder(o => ({ ...o, notes: e.target.value }))} />
              <div className="actions-row">
                <button className="btn" disabled={order.saving}>{order.saving ? (isArabic ? 'جاري الإرسال' : 'Sending') : (isArabic ? 'إرسال إلى الإدارة' : 'Send to Admin')}</button>
                {order.message && <span className="muted">{order.message}</span>}
              </div>
            </form>
          )}
        </div>
      </div>

      <div className="container section compact">
        <h2>{isArabic ? 'التقييمات' : 'Reviews'}</h2>
        <form className="card" style={{ padding: '1rem', marginBottom: '1rem' }} onSubmit={submitReview}>
          <div className="rating-stars">
            {[1, 2, 3, 4, 5].map(n => (
              <button type="button" key={n} onClick={() => setReview(r => ({ ...r, rating: n }))}>
                {n <= review.rating ? '★' : '☆'}
              </button>
            ))}
          </div>
          <textarea rows="3" placeholder={isArabic ? 'اكتب تعليقك' : 'Write your comment'} value={review.comment} onChange={e => setReview(r => ({ ...r, comment: e.target.value }))} />
          <div className="actions-row">
            <button className="btn" disabled={review.saving}>{isArabic ? 'إرسال التقييم' : 'Submit review'}</button>
            {review.message && <span className="muted">{review.message}</span>}
          </div>
        </form>

        <div className="grid">
          {reviews.length ? reviews.map(r => (
            <div className="card" key={r.id} style={{ padding: '1rem' }}>
              <strong>{r.name}</strong>
              <p>{'★'.repeat(r.rating)}</p>
              <p>{r.comment}</p>
            </div>
          )) : <p className="muted">{tr('noReviews')}</p>}
        </div>
      </div>
    </section>
    </>
  );
}
