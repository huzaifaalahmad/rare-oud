import { useEffect, useMemo, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import api from '../services/api.js';
import ProductCard from '../components/products/ProductCard.jsx';
import ProductFilters from '../components/products/ProductFilters.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import SkeletonGrid from '../components/common/SkeletonGrid.jsx';
import SEO from '../components/seo/SEO.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';

export default function Products({ defaultCategory } = {}) {
  const { slug } = useParams();
  const location = useLocation();
  const categorySlug = slug || defaultCategory || (location.pathname === '/accessories' ? 'accessories' : undefined);
  const { tr } = useLanguage();
  const [products, setProducts] = useState([]);
  const [filters, setFilters] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const isAccessories = categorySlug === 'accessories';
    const params = {
      category: categorySlug,
      q: filters.search || undefined,
      condition: filters.condition || undefined,
      wood: !isAccessories ? filters.wood || undefined : undefined,
      accessory: isAccessories ? filters.accessory || undefined : undefined,
      country: filters.country || undefined
    };
    if (filters.availability === 'in_stock') params.available = 'true';

    api.get('/products', { params })
      .then(r => { if (active) setProducts(r.data.products || []); })
      .catch(() => { if (active) setProducts([]); })
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, [categorySlug, filters.search, filters.condition, filters.availability, filters.wood, filters.accessory, filters.country]);

  const visible = useMemo(() =>
    products.filter(p => filters.availability === 'out_of_stock' ? Number(p.stock) <= 0 : true),
    [products, filters.availability]
  );

  const pageTitle = categorySlug === 'accessories'
    ? tr('accessories')
    : categorySlug
      ? `${tr('products')} - ${tr(categorySlug) || categorySlug}`
      : tr('products');

  return <section className="section"><SEO title={pageTitle} /><div className="container"><div className="product-toolbar"><div><span className="eyebrow">Rare Oud Catalogue</span><h1 className="section-title">{categorySlug === 'accessories' ? tr('accessories') : tr('products')}</h1><p className="muted">{visible.length} {tr('results')}</p></div></div><ProductFilters filters={filters} setFilters={setFilters} categorySlug={categorySlug} products={products} />{loading ? <SkeletonGrid /> : <div className="grid product-grid">{visible.map(p => <ProductCard key={p.id} product={p} />)}{!visible.length && <EmptyState title={tr('noResults')} body={tr('noResultsBody')} />}</div>}</div></section>;
}
