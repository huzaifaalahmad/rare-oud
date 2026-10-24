import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Hero from '../components/home/Hero.jsx';
import ProductCard from '../components/products/ProductCard.jsx';
import SEO from '../components/seo/SEO.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import SkeletonGrid from '../components/common/SkeletonGrid.jsx';
import api from '../services/api.js';
import { useLanguage } from '../context/LanguageContext.jsx';
import { normalizeCatalog, categoryTitle } from '../utils/catalog.js';
export default function Home() {
  const [catalog, setCatalog] = useState({ ouds: [], accessories: [], loading: true, error: false });
  const [blocks, setBlocks] = useState([]);
  const [attempt, retry] = useState(0);
  const { tr, lang } = useLanguage(); const ar = lang === 'ar';
  useEffect(() => {
    const controller = new AbortController();
    setCatalog(c => ({ ...c, loading: true, error: false }));
    Promise.all([
      api.get('/products', { params: { kind: 'oud', featured: '1', limit: 4 }, signal: controller.signal }),
      api.get('/products', { params: { kind: 'accessory', category: 'accessories', featured: '1', limit: 4 }, signal: controller.signal })
    ]).then(([ouds, accessories]) => { if (!controller.signal.aborted) setCatalog({ ouds: normalizeCatalog(ouds.data).products, accessories: normalizeCatalog(accessories.data).products, loading: false, error: false }); })
      .catch(() => { if (!controller.signal.aborted) setCatalog({ ouds: [], accessories: [], loading: false, error: true }); });
    api.get('/content/pages/home', { signal: controller.signal }).then(({ data }) => { if (!controller.signal.aborted) setBlocks(Array.isArray(data.blocks) ? data.blocks : []); }).catch(() => {});
    return () => controller.abort();
  }, [attempt]);
  const { ouds, accessories } = catalog;
  return <><SEO title={ar ? 'الرئيسية' : 'Home'} /><Hero blocks={blocks} />
    <nav className="container collection-navigation" aria-label={ar ? 'تصفح التصنيفات' : 'Browse categories'}>{['educational','intermediate','rare','vip','accessories'].map(s => <Link key={s} to={`/category/${s}`}>{categoryTitle(s,lang)}</Link>)}</nav>
    <section className="section atelier-collection" aria-labelledby="featured-title"><div className="container">
      <div className="collection-heading"><div><h2 className="section-title" id="featured-title">{tr('featured')}</h2><p className="muted">{ar ? 'تعرّف على تفاصيل كل آلة، وخشبها، وصوتها.' : 'Explore each instrument, its wood and its sound.'}</p></div><Link className="text-link" to="/products">{ar ? 'كل الأعواد' : 'All ouds'}</Link></div>
      {catalog.loading ? <SkeletonGrid count={4} /> : catalog.error ? <div className="catalog-state" role="alert"><h3>{ar ? 'تعذّر تحميل المجموعة' : 'The collection could not be loaded'}</h3><p>{ar ? 'تحقّق من الاتصال وأعد المحاولة.' : 'Check your connection and try again.'}</p><button className="btn" onClick={() => retry(n=>n+1)}>{ar ? 'إعادة المحاولة' : 'Try again'}</button></div> : <div className="grid product-grid">{ouds.map(p=><ProductCard key={p.id} product={p}/>)}{!ouds.length && <EmptyState title={ar?'لا توجد أعواد مميزة حالياً':'No featured ouds at the moment'} body={ar?'تصفح بقية المجموعة.':'Explore the rest of the collection.'} actionLabel={tr('browseProducts')} to="/products"/>}</div>}
    </div></section>
    {!!accessories.length && <section className="section atelier-accessories"><div className="container"><div className="collection-heading"><h2 className="section-title">{tr('accessories')}</h2><Link className="text-link" to="/accessories">{ar?'كل الأكسسوارات':'All accessories'}</Link></div><div className="grid product-grid">{accessories.map(p=><ProductCard key={p.id} product={p}/>)}</div></div></section>}
  </>;
}
