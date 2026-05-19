import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext.jsx';
import api from '../../services/api.js';
import AdaptiveHeroBackdrop from './AdaptiveHeroBackdrop.jsx';

function blockMap(blocks = []) {
  const out = {};
  for (const b of blocks) out[b.block_key] = b;
  return out;
}

export default function Hero() {
  const { tr, lang } = useLanguage();
  const [blocks, setBlocks] = useState({});
  useEffect(() => { api.get('/content/pages/home').then(r => setBlocks(blockMap(r.data.blocks))).catch(() => {}); }, []);
  const content = useMemo(() => ({
    title: blocks['home.hero.title']?.[`content_${lang}`] || tr('heroTitle'),
    sub: blocks['home.hero.subtitle']?.[`content_${lang}`] || tr('heroSub'),
    cta: blocks['home.hero.cta']?.[`content_${lang}`] || tr('shopNow')
  }), [blocks, lang, tr]);

  return <section className="hero"><AdaptiveHeroBackdrop /><div className="container hero-grid">
    <div className="hero-copy reveal-up">
      <span className="eyebrow">Rare • Handpicked • Musical</span><h1 className="title">{content.title}</h1><p className="muted">{content.sub}</p>
      <div className="hero-actions"><Link className="btn" to="/products">{content.cta}</Link><Link className="btn secondary" to="/custom-order">{tr('customOrder')}</Link></div>
      <div className="stats stagger"><div className="stat"><strong>5+</strong><span className="muted">تصنيفات مختارة</span></div><div className="stat"><strong>Global</strong><span className="muted">شحن من سوريا للعالم</span></div><div className="stat"><strong>Premium</strong><span className="muted">خدمة فاخرة موثوقة</span></div></div>
    </div>
    <div className="card hero-logo reveal-up">
      <div className="hero-sound-signature" aria-hidden="true">
        <span /><span /><span /><span /><span /><span /><span />
      </div>
      <img src="/logo.svg" alt="Rare Oud" loading="eager" decoding="async" />
      <div className="hero-reflection-line" aria-hidden="true" />
    </div>
  </div></section>;
}
