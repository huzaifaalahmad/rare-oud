import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext.jsx';

export default function NotFoundPage(){
  const { lang } = useLanguage();
  return <section className="section"><div className="container card" style={{padding:'3rem 1.5rem',textAlign:'center'}}><p className="eyebrow">404</p><h1 className="title">{lang==='ar'?'الصفحة غير موجودة':'Page not found'}</h1><p>{lang==='ar'?'الرابط الذي تحاول فتحه غير متاح أو تم نقله.':'The page you are looking for is not available or has moved.'}</p><Link className="btn" to="/">{lang==='ar'?'العودة للرئيسية':'Go Home'}</Link></div></section>;
}
