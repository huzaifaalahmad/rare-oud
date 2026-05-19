import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Instagram, Mail, MessageCircle } from 'lucide-react';
import api from '../../services/api.js';
import { useLanguage } from '../../context/LanguageContext.jsx';

function normalizeSettings(rows) {
  return (Array.isArray(rows) ? rows : []).reduce((acc, row) => {
    let json = row.value_json;
    if (typeof json === 'string') {
      try { json = JSON.parse(json); } catch { json = null; }
    }
    acc[row.setting_key] = json?.url || row.value_ar || row.value_en || '';
    return acc;
  }, {});
}

export default function Footer() {
  const { lang } = useLanguage();
  const [settings, setSettings] = useState({});
  const isArabic = lang === 'ar';

  useEffect(() => {
    let active = true;
    api.get('/content/settings')
      .then(({ data }) => {
        if (active) setSettings(normalizeSettings(data.settings));
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  const social = useMemo(() => {
    const whatsapp = String(settings.whatsapp_phone || '').replace(/\D/g, '');
    return [
      settings.instagram_url && { label: 'Instagram', href: settings.instagram_url, Icon: Instagram },
      settings.facebook_url && { label: 'Facebook', href: settings.facebook_url, Icon: Facebook },
      whatsapp && { label: 'WhatsApp', href: `https://wa.me/${whatsapp}`, Icon: MessageCircle },
      settings.contact_email && { label: 'Email', href: `mailto:${settings.contact_email}`, Icon: Mail }
    ].filter(Boolean);
  }, [settings]);
  const whatsapp = String(settings.whatsapp_phone || '').replace(/\D/g, '');
  const pageLinks = [
    { to: '/shipping', ar: 'الشحن', en: 'Shipping' },
    { to: '/return-policy', ar: 'الإرجاع', en: 'Returns' },
    { to: '/after-sales', ar: 'ما بعد البيع', en: 'After sales' },
    { to: '/contact', ar: 'تواصل معنا', en: 'Contact' }
  ];

  return (
    <footer className="footer">
      <div className="container footer-grid footer-luxury-grid">
        <div className="footer-brand">
          <img src="/logo.svg" width="70" loading="lazy" decoding="async" alt="Rare Oud logo" />
          <h3>{isArabic ? 'العود النادر' : 'Rare Oud'}</h3>
          <p>{isArabic ? 'من سوريا إلى العالم، أعواد مختارة بروح فنية وصوت أصيل.' : 'From Syria to the world, curated ouds with authentic sound.'}</p>
        </div>
        <div className="footer-panel footer-pages-card">
          <h4>{isArabic ? 'الصفحات' : 'Pages'}</h4>
          <div className="footer-page-links">
            {pageLinks.map(link => (
              <Link to={link.to} key={link.to}>
                <span>{isArabic ? link.ar : link.en}</span>
              </Link>
            ))}
          </div>
        </div>
        <div className="footer-panel footer-social-card">
          <h4>{isArabic ? 'التواصل' : 'Social'}</h4>
          <div className="footer-social">
            {social.map(({ label, href, Icon }) => (
              <a href={href} target="_blank" rel="noreferrer" key={label} aria-label={label}>
                <Icon size={18} />
                <span>{label}</span>
              </a>
            ))}
          </div>
        </div>
        <div className="footer-panel footer-direct-card">
          <h4>{isArabic ? 'تواصل سريع' : 'Direct contact'}</h4>
          <p>{isArabic ? 'للاستفسار عن عود أو طلب تخصيص، تواصل معنا مباشرة.' : 'For oud inquiries or custom requests, contact us directly.'}</p>
          {whatsapp && (
            <a className="btn secondary" href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer">
              <MessageCircle size={17} />
              {isArabic ? 'واتساب' : 'WhatsApp'}
            </a>
          )}
        </div>
      </div>
    </footer>
  );
}
