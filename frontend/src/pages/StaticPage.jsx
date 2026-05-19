import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Gem, Sparkles, ExternalLink } from 'lucide-react';
import api from '../services/api.js';
import { useLanguage } from '../context/LanguageContext.jsx';
import SEO from '../components/seo/SEO.jsx';

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

export default function StaticPage({ slug }) {
  const [payload, setPayload] = useState({loading:true,error:'',page:null,blocks:[]});
  const { lang } = useLanguage();
  useEffect(() => { let active=true; setPayload(p=>({...p,loading:true,error:''})); api.get(`/content/pages/${slug}`).then(r => active&&setPayload({loading:false,error:'',...(r.data||{})})).catch(() => active&&setPayload({loading:false,error:'',page:null,blocks:[]})); return()=>{active=false}; }, [slug]);
  const data = useMemo(() => payload?.page || fallback[slug] || { title_ar: slug, title_en: slug, body_ar: 'هذه الصفحة قابلة للتعديل من لوحة التحكم.', body_en: 'This page is editable from admin.' }, [payload, slug]);
  const blocks = payload?.blocks || [];
  const title = data?.[`title_${lang}`] || slug;
  const hero = parseHero(blocks.find(b=>b.block_type==='hero' || b.block_key?.endsWith('.hero')), lang);
  const textBlocks = blocks.filter(b=>!(b.block_type==='hero' || b.block_key?.endsWith('.hero'))).map(b=>b?.[`content_${lang}`]).filter(Boolean);
  const body = textBlocks.length ? textBlocks.join('\n\n') : (data?.[`body_${lang}`] || fallback[slug]?.[`body_${lang}`] || preparing[`body_${lang}`]);
  const linkCards = slug==='links' ? [{to:'/products',ar:'المنتجات',en:'Products'},{to:'/accessories',ar:'الأكسسوارات',en:'Accessories'},{to:'/custom-order',ar:'طلب تخصيص',en:'Custom order'},{to:'/shipping',ar:'الشحن',en:'Shipping'}] : [];
  return <section className="section"><SEO title={title} description={(body||'').slice(0, 150)} /><div className="container">
    <div className="card luxury-hero" style={{padding:'1.4rem',marginBottom:'1.2rem'}}><div><span className="eyebrow"><Sparkles size={16}/> Rare Oud</span><h1 className="section-title">{hero?.title || title}</h1><p className="muted">{hero?.subtitle || (slug==='about'?(lang==='ar'?'خبرة، توثيق، وذائقة موسيقية فاخرة.':'Expertise, documentation, and refined musical taste.'):title)}</p></div><img loading="lazy" decoding="async" src={hero?.image || '/logo.svg'} alt={title}/></div>
    <div className="card" style={{ padding: '1.4rem', lineHeight: 2, whiteSpace: 'pre-wrap' }}>{body || preparing[`body_${lang}`]}</div>
    {slug==='accessories'&&<div className="grid" style={{marginTop:'1.2rem'}}>{['حماية','عناية','عرض'].map((ar,i)=><article className="card" key={ar} style={{padding:'1rem'}}><Gem/><h3>{lang==='ar'?ar:['Protection','Care','Display'][i]}</h3><p className="muted">{lang==='ar'?'قابل للتعديل من لوحة الأدمن ضمن محتوى الصفحة.':'Editable from admin page content.'}</p></article>)}</div>}
    {linkCards.length>0&&<div className="grid" style={{marginTop:'1.2rem'}}>{linkCards.map(l=><Link className="card" style={{padding:'1rem',textDecoration:'none'}} to={l.to} key={l.to}><ExternalLink/> {lang==='ar'?l.ar:l.en}</Link>)}</div>}
  </div></section>;
}
