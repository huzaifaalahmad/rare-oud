import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Gem, Sparkles, ExternalLink } from 'lucide-react';
import api from '../services/api.js';
import { useLanguage } from '../context/LanguageContext.jsx';
import SEO from '../components/seo/SEO.jsx';
import { policyKeys, policyContent } from '../utils/policyContent.js';

const preparing = { title_ar: 'هذه الصفحة قيد الإعداد', title_en: 'This page is being prepared', body_ar: 'هذه الصفحة قيد الإعداد وسيتم تحديث محتواها قريباً من لوحة التحكم.', body_en: 'This page is being prepared and will be updated soon from the admin dashboard.' };
const fallback = {
  about: { title_ar: 'من نحن', title_en: 'About', body_ar: 'العود النادر متجر متخصص في اختيار الأعواد الموسيقية والإكسسوارات بعناية، مع تركيز على الصوت، الخشب، التاريخ، والندرة.', body_en: 'Rare Oud curates fine ouds and accessories with a focus on sound, wood, history, and rarity.' },
  accessories: { title_ar: 'الأكسسوارات', title_en: 'Accessories', body_ar: 'حقائب مبطنة، أوتار، ريش، قواعد عرض، ومنتجات عناية للأعواد الفاخرة.', body_en: 'Cases, strings, picks, display stands, and care products for fine ouds.' },
  links: { title_ar: 'روابط مهمة', title_en: 'Important Links', body_ar: 'تابعنا وتواصل معنا واطلع على الروابط والسياسات من هنا.', body_en: 'Follow us, contact us, and open links and policies here.' },
  'return-policy': { title_ar: 'سياسة الإرجاع', title_en: 'Return Policy', body_ar: 'يمكن طلب الإرجاع وفق حالة المنتج، سلامة التغليف، وتوثيق الفحص عند الاستلام.', body_en: 'Returns depend on product condition, packaging safety, and receiving inspection.' },
  shipping: { title_ar: 'الشحن والتغليف', title_en: 'Shipping & Packaging', body_ar: 'نشحن داخل سوريا وإلى أنحاء العالم مع تغليف يحمي الآلة من الصدمات والرطوبة قدر الإمكان.', body_en: 'We ship inside Syria and internationally with careful packaging for shock and humidity protection.' },
  'after-sales': { title_ar: 'خدمات ما بعد البيع', title_en: 'After-sales', body_ar: 'نقدم إرشادات للعناية، الضبط الأولي، ونصائح الحفظ والاستخدام بعد الشراء.', body_en: 'We provide care guidance, initial setup tips, and post-purchase support.' },
  contact: { title_ar: 'تواصل معنا', title_en: 'Contact', body_ar: 'تواصل معنا عبر فيسبوك أو معلومات التواصل التي يضيفها الأدمن من لوحة التحكم.', body_en: 'Contact us through Facebook or the contact details managed by the admin.' }
};
function parseHero(block, lang){ try { const j=JSON.parse(block?.[`content_${lang}`]||'{}'); return j; } catch { return null; } }

const pageVisuals = { shipping: '/visual/oud-packaging.webp', packaging: '/visual/oud-packaging.webp', 'after-sales': '/visual/oud-craft.webp', 'return-policy': '/visual/oud-detail.webp', about: '/visual/oud-craft.webp' };
const policyLinks = [
  {to:'/return-policy',ar:'الإرجاع والضمان',en:'Returns & warranty'},
  {to:'/shipping',ar:'الشحن والتغليف',en:'Shipping & packaging'},
  {to:'/after-sales',ar:'خدمات ما بعد البيع',en:'After-sales support'}
];
function PolicyText({text, ...props}) {
  return <div className="policy-body" {...props}>{text.split(/\n(?=\d+\.\s)/).filter(Boolean).map((paragraph,i)=><p key={i}>{paragraph}</p>)}</div>;
}
export default function StaticPage({ slug }) {
  const [payload, setPayload] = useState({loading:true,error:false,page:null,blocks:[]});
  const [attempt,retry] = useState(0);
  const { lang } = useLanguage(); const ar=lang==='ar'; const isPolicy=Boolean(policyKeys[slug]);
  useEffect(() => {
    const controller=new AbortController();
    setPayload({loading:true,error:false,page:null,blocks:[]});
    Promise.all([
      api.get(`/content/pages/${slug}`, {signal:controller.signal}),
      isPolicy ? api.get('/content/pages/home', {signal:controller.signal}) : Promise.resolve(null)
    ]).then(([page,home])=>{
      if (!controller.signal.aborted) setPayload({loading:false,error:false,...page.data,homeBlocks:home?.data?.blocks||[]});
    }).catch(()=>{if(!controller.signal.aborted)setPayload({loading:false,error:true,page:null,blocks:[]})});
    return()=>controller.abort();
  },[slug,attempt,isPolicy]);
  const data=payload.page||fallback[slug]||preparing;
  const title=slug==='return-policy'?(ar?'سياسة الإرجاع والضمان':'Returns & warranty'):data[`title_${lang}`];
  const hero=parseHero((payload.blocks||[]).find(b=>b.block_type==='hero'||b.block_key?.endsWith('.hero')),lang);
  const {body,originalArabic}=policyContent(slug,payload,lang);
  const text=body||data[`body_${lang}`]||data[`content_${lang}`]||preparing[`body_${lang}`];
  const visual=hero?.image||pageVisuals[slug];
  const linkCards=slug==='links'?[{to:'/products',ar:'الأعواد',en:'Ouds'},{to:'/accessories',ar:'الأكسسوارات',en:'Accessories'},{to:'/custom-order',ar:'طلب تخصيص',en:'Custom order'},...policyLinks]:[];
  return <section className="section information-page" data-motion-static>
    <SEO title={title} description={text.slice(0,150)}/>
    <div className="container">
      <nav className="catalog-breadcrumb" aria-label={ar?'مسار الصفحة':'Breadcrumb'}><Link to="/">{ar?'الرئيسية':'Home'}</Link><span>/</span><span>{title}</span></nav>
      <header className={`information-hero ${visual?'has-visual':''}`}>
        <div><span className="eyebrow"><Sparkles size={16}/> Rare Oud</span><h1>{hero?.title||title}</h1>{hero?.subtitle&&<p className="muted">{hero.subtitle}</p>}</div>
        {visual&&<img src={visual} alt={ar?'تصوّر بصري من هوية العود النادر':'Concept artwork from the Rare Oud brand collection'} width="960" height="640" decoding="async"/>}
      </header>
      {isPolicy&&<nav className="catalog-collections policy-navigation" aria-label={ar?'سياسات المتجر':'Store policies'}>{policyLinks.map(l=><Link to={l.to} key={l.to} aria-current={l.to===`/${slug}`?'page':undefined}>{ar?l.ar:l.en}</Link>)}</nav>}
      {payload.loading?<div className="policy-document" role="status">{ar?'جارٍ تحميل التفاصيل…':'Loading details…'}</div>:payload.error?<div className="catalog-state" role="alert"><h2>{ar?'تعذّر تحميل التفاصيل':'Details could not be loaded'}</h2><p>{ar?'أعد المحاولة لقراءة النص الكامل.':'Please try again to read the complete text.'}</p><button className="btn" onClick={()=>retry(n=>n+1)}>{ar?'إعادة المحاولة':'Try again'}</button></div>:<article className="policy-document" aria-label={title}>
        <PolicyText text={text}/>
        {!ar&&originalArabic&&<section className="policy-original"><h2>Full policy · Arabic original</h2><PolicyText text={originalArabic} lang="ar" dir="rtl"/></section>}
        {isPolicy&&<div className="policy-contact"><Link className="text-link" to="/contact">{ar?'للاستفسار عن هذه التفاصيل، تواصل معنا':'Contact us about these details'}</Link></div>}
      </article>}
      {slug==='accessories'&&<div className="grid">{['حماية','عناية','عرض'].map((label,i)=><article className="card" key={label} style={{padding:'1rem'}}><Gem/><h3>{ar?label:['Protection','Care','Display'][i]}</h3></article>)}</div>}
      {!!linkCards.length&&<div className="grid information-links">{linkCards.map(l=><Link className="card" to={l.to} key={l.to}><ExternalLink/> {ar?l.ar:l.en}</Link>)}</div>}
    </div>
  </section>;
}
