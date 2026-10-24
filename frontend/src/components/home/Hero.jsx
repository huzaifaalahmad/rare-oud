import { Link } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext.jsx';
export default function Hero({ blocks = [] }) {
  const { tr, lang } = useLanguage();
  const content = key => blocks.find(b => b.block_key === `home.hero.${key}`)?.[`content_${lang}`];
  const subtitle=content('subtitle');
  const intro=subtitle&& !/demo catalog|مجموعة تجريبية/.test(subtitle)?subtitle:(lang==='ar'?'أعواد موسيقية وأكسسوارات مختارة. استكشف تفاصيل كل قطعة وصوتها.':'Selected musical ouds and accessories. Explore each piece and its sound.');
  return <section className="atelier-hero" data-motion-static>
    <div className="atelier-hero-image"><picture>
      <source media="(max-width: 640px)" srcSet="/visual/oud-gallery-800.webp" />
      <img src="/visual/oud-gallery.webp" alt={lang === 'ar' ? 'تصوّر معرض العود النادر من ملفات الهوية الأصلية' : 'Rare Oud gallery concept from the original brand artwork'} width="1680" height="640" fetchpriority="high" decoding="async" />
    </picture></div>
    <div className="container atelier-hero-intro"><div>
      <h1>{content('title') || tr('heroTitle')}</h1><p>{intro}</p>
    </div><div className="atelier-hero-actions"><Link className="btn" to="/products">{content('cta') || tr('browseProducts')}</Link><Link className="btn secondary" to="/custom-order">{tr('customOrder')}</Link></div></div>
  </section>;
}
