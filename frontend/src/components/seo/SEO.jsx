import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function SEO({ title, description, image = '/visual/oud-gallery.webp', type = 'website' }) {
  const {pathname}=useLocation();
  useEffect(() => {
    const site = 'Rare Oud | العود النادر';
    document.title = title ? `${title} — ${site}` : site;
    const tags = {
      description: description || 'متجر العود النادر لبيع الأعواد الموسيقية والإكسسوارات الفاخرة من سوريا إلى العالم.',
      'og:title': document.title,
      'og:description': description || 'أعواد تعليمية، متوسطة، نادرة، VIP وإكسسوارات مختارة بعناية.',
      'og:type': type,
      'og:image': new URL(image,window.location.origin).href,
      'og:url': window.location.origin+pathname,
      'twitter:card': 'summary_large_image'
    };
    Object.entries(tags).forEach(([name, content]) => {
      const selector = name.startsWith('og:') ? `meta[property="${name}"]` : `meta[name="${name}"]`;
      let el = document.head.querySelector(selector);
      if (!el) {
        el = document.createElement('meta');
        if (name.startsWith('og:')) el.setAttribute('property', name); else el.setAttribute('name', name);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    });
    let canonical=document.head.querySelector('link[rel="canonical"]');
    if(!canonical){canonical=document.createElement('link');canonical.rel='canonical';document.head.appendChild(canonical)}
    canonical.href=window.location.origin+pathname;
  }, [title, description, image, type, pathname]);
  return null;
}
