import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import api from '../services/api.js';
import ProductCard from '../components/products/ProductCard.jsx';
import ProductFilters from '../components/products/ProductFilters.jsx';
import SkeletonGrid from '../components/common/SkeletonGrid.jsx';
import SEO from '../components/seo/SEO.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import { normalizeCatalog, categoryTitle } from '../utils/catalog.js';
const PAGE_SIZE=12;
export default function Products({ defaultCategory }={}) {
  const {slug}=useParams();const location=useLocation();
  const categorySlug=slug==='medium'?'intermediate':slug||defaultCategory||(location.pathname==='/accessories'?'accessories':undefined);
  const {tr,lang}=useLanguage();const ar=lang==='ar';
  const [filters,setFilters]=useState({});const [page,setPage]=useState(1);const [sort,setSort]=useState('featured');const [attempt,retry]=useState(0);
  const [state,setState]=useState({products:[],total:0,loading:true,error:false});const filterKey=JSON.stringify(filters);
  useEffect(()=>{setPage(1)},[categorySlug,filterKey,sort]);
  useEffect(()=>{
    const controller=new AbortController();setState(s=>({...s,loading:true,error:false}));
    const params={category:categorySlug,q:filters.search||undefined,condition:filters.condition||undefined,wood:categorySlug!=='accessories'?filters.wood||undefined:undefined,accessory:categorySlug==='accessories'?filters.accessory||undefined:undefined,country:filters.country||undefined,sort,limit:PAGE_SIZE,offset:(page-1)*PAGE_SIZE,available:filters.availability==='in_stock'?'true':filters.availability==='out_of_stock'?'false':undefined};
    api.get('/products',{params,signal:controller.signal}).then(({data})=>{if(!controller.signal.aborted)setState({...normalizeCatalog(data),loading:false,error:false})}).catch(()=>{if(!controller.signal.aborted)setState({products:[],total:0,loading:false,error:true})});
    return ()=>controller.abort();
  },[categorySlug,filterKey,page,sort,attempt]);
  const title=categorySlug?categoryTitle(categorySlug,lang):tr('products');const pages=Math.max(1,Math.ceil(state.total/PAGE_SIZE));
  function changePage(next){setPage(next);document.querySelector('.atelier-catalog')?.scrollIntoView({block:'start',behavior:'instant'});}
  return <section className="section atelier-catalog"><SEO title={title}/><div className="container">
    <nav className="catalog-breadcrumb" aria-label={ar?'مسار الصفحة':'Breadcrumb'}><Link to="/">{tr('home')}</Link><span>/</span><span>{title}</span></nav>
    <div className="product-toolbar"><div><h1 className="section-title">{title}</h1><p className="muted" aria-live="polite">{state.loading?(ar?'جارٍ تحميل المجموعة…':'Loading collection…'):state.error?'':`${state.total} ${tr('results')}`}</p></div><label className="catalog-sort">{ar?'ترتيب حسب':'Sort by'}<select value={sort} onChange={e=>setSort(e.target.value)}><option value="featured">{ar?'المختارات':'Featured'}</option><option value="newest">{ar?'الأحدث':'Newest'}</option><option value="price_asc">{ar?'السعر: من الأقل':'Price: low to high'}</option><option value="price_desc">{ar?'السعر: من الأعلى':'Price: high to low'}</option></select></label></div>
    <ProductFilters filters={filters} setFilters={setFilters} categorySlug={categorySlug} products={state.products}/>
    {state.loading?<SkeletonGrid count={8}/>:state.error?<div role="alert" className="catalog-state"><h2>{ar?'تعذّر تحميل المنتجات':'Products could not be loaded'}</h2><p>{ar?'قد يكون الاتصال منقطعاً. أعد المحاولة.':'The connection may be unavailable. Please try again.'}</p><button className="btn" onClick={()=>retry(n=>n+1)}>{ar?'إعادة المحاولة':'Try again'}</button></div>:state.products.length?<><div className="grid product-grid">{state.products.map(p=><ProductCard key={p.id} product={p}/>)}</div>{pages>1&&<nav className="catalog-pagination" aria-label={ar?'صفحات المنتجات':'Product pages'}><button className="btn secondary" disabled={page<=1} onClick={()=>changePage(page-1)}>{ar?'السابق':'Previous'}</button><span aria-live="polite">{ar?`صفحة ${page} من ${pages}`:`Page ${page} of ${pages}`}</span><button className="btn secondary" disabled={page>=pages} onClick={()=>changePage(page+1)}>{ar?'التالي':'Next'}</button></nav>}</>:<div className="catalog-state" role="status"><h2>{tr('noResults')}</h2><p>{tr('noResultsBody')}</p><button className="btn" onClick={()=>{setFilters({});setPage(1)}}>{tr('reset')}</button></div>}
  </div></section>;
}
