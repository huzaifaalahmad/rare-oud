import { useEffect, useMemo, useState } from 'react';
import Hero from '../components/home/Hero.jsx';
import ProductCard from '../components/products/ProductCard.jsx';
import SEO from '../components/seo/SEO.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import api from '../services/api.js';
import { useLanguage } from '../context/LanguageContext.jsx';

const fallbackPolicies = {
  shipping: {
    ar: 'تغليف آمن وشحن محلي ودولي مع توثيق حالة الآلة قبل الإرسال.',
    en: 'Secure packaging and local/international shipping with instrument condition documentation before dispatch.'
  },
  returns: {
    ar: 'سياسة واضحة حسب حالة المنتج والفحص بعد الاستلام.',
    en: 'Clear return policy based on product condition and inspection after delivery.'
  },
  afterSales: {
    ar: 'دعم بعد البيع للضبط، النصائح، والصيانة الأساسية.',
    en: 'After-sales support for tuning, advice, and basic maintenance.'
  }
};

function blockText(blocks, key, lang, fallback) {
  const block = blocks.find(b => b.block_key === key || b.block_key === `home.${key}`);
  return block?.[lang === 'ar' ? 'content_ar' : 'content_en'] || fallback;
}

export default function Home() {
  const [products, setProducts] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const { tr, lang } = useLanguage();

  useEffect(() => {
    api.get('/products?featured=1')
      .then(r => setProducts(r.data.products || r.data || []))
      .catch(() => setProducts([]));
    api.get('/content/pages/home')
      .then(r => setBlocks(r.data.blocks || []))
      .catch(() => {});
  }, []);

  const policies = useMemo(() => ([
    { key: 'shipping', title: tr('shipping'), body: blockText(blocks, 'policy.shipping.body', lang, fallbackPolicies.shipping[lang] || fallbackPolicies.shipping.ar) },
    { key: 'returns', title: tr('returns'), body: blockText(blocks, 'policy.returns.body', lang, fallbackPolicies.returns[lang] || fallbackPolicies.returns.ar) },
    { key: 'afterSales', title: tr('afterSales'), body: blockText(blocks, 'policy.afterSales.body', lang, fallbackPolicies.afterSales[lang] || fallbackPolicies.afterSales.ar) }
  ]), [blocks, lang, tr]);

  return <>
    <SEO title={lang === 'ar' ? 'الرئيسية' : 'Home'} />
    <Hero />
    <section className="section compact">
      <div className="container policy-grid stagger">
        {policies.map(policy => <div className="card policy-card" key={policy.key}>
          <h3>{policy.title}</h3>
          <p className="muted">{policy.body}</p>
        </div>)}
      </div>
    </section>
    <section className="section">
      <div className="container">
        <span className="eyebrow">Rare Oud</span>
        <h2 className="section-title">{tr('featured')}</h2>
        <div className="grid product-grid">
          {products.length ? products.slice(0, 8).map(p => <ProductCard key={p.id} product={p} />) : (
            <EmptyState
              title={lang === 'ar' ? 'لا توجد منتجات مميزة حاليًا' : 'No featured products yet'}
              body={lang === 'ar' ? 'ستظهر المنتجات المفعلة من لوحة الإدارة هنا بعد إضافتها.' : 'Featured products added from the admin dashboard will appear here.'}
              actionLabel={tr('browseProducts')}
              to="/products"
            />
          )}
        </div>
      </div>
    </section>
  </>;
}
