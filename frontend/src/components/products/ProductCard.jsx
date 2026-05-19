import { Link } from 'react-router-dom';
import { memo, useState } from 'react';
import { useLanguage } from '../../context/LanguageContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import api from '../../services/api.js';
import Icon from '../ui/Icon.jsx';

const apiBase = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace('/api', '');

function img(src) {
  if (!src) return '/logo.svg';
  return src.startsWith('http') ? src : `${apiBase}${src}`;
}

function ProductCard({ product }) {
  const { lang, tr } = useLanguage();
  const { user } = useAuth();
  const [likes, setLikes] = useState(Number(product.likes_count || 0));
  const [msg, setMsg] = useState('');

  const name = lang === 'ar' ? product.name_ar : product.name_en;
  const isOut = Number(product.stock) <= 0;
  const category = lang === 'ar' ? product.category_name_ar : product.category_name_en;
  const wood = lang === 'ar' ? product.woods_ar : product.woods_en;
  const origin = lang === 'ar' ? product.origin_country_ar : product.origin_country_en;
  const productPath = `/products/${product.slug || product.id}`;

  async function favorite() {
    if (!user) {
      setMsg(lang === 'ar' ? 'سجّل الدخول للمفضلة' : 'Login to favorite');
      return;
    }

    const { data } = await api.post(`/favorites/${product.id}/toggle`);
    setLikes(Number(data.likes_count || 0));
    setMsg(data.favorited ? (lang === 'ar' ? 'أضيفت' : 'Added') : (lang === 'ar' ? 'أزيلت' : 'Removed'));
  }

  return (
    <article className="card product-card reveal motion-surface">
      <span className="product-badge">
        {isOut ? tr('outOfStock') : category || 'Rare Oud'}
      </span>

      <Link className="product-image-link" to={productPath} aria-label={name}>
        <img
          width="640"
          height="480"
          src={img(product.primary_image)}
          alt={name}
          loading="lazy"
          decoding="async"
        />
      </Link>

      <div className="product-body music-wave">
        <div className="eyebrow">{wood || 'Oud'}</div>
        <h3>{name}</h3>
        <p className="muted">{origin || 'Syria'} • {product.condition_status === 'used' ? tr('used') : tr('new')}</p>

        <p className="muted product-meta-line">
          <span><Icon name="reviews" size={14} /> {product.avg_rating || '-'}</span>
          <span><Icon name="favorite" size={14} /> {likes}</span>
        </p>

        <strong className="price">${Number(product.price || 0).toLocaleString()}</strong>

        <div className="product-card-actions">
          <Link className="btn" to={productPath}>
            <Icon name="whatsapp" size={17} />
            <span>{lang === 'ar' ? 'طلب / استفسار' : 'Request / Inquiry'}</span>
          </Link>
          <Link className="btn secondary" to={productPath}>
            {tr('details')}
          </Link>
          <button className="icon-btn" aria-label="favorite" onClick={favorite}>
            <Icon name="favorite" size={18} />
          </button>
        </div>

        {msg && <small className="muted">{msg}</small>}
      </div>
    </article>
  );
}

export default memo(ProductCard);
