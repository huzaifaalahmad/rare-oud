import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const evidence = fileURLToPath(new URL('../evidence/', import.meta.url));
const read = name => JSON.parse(readFileSync(path.join(evidence, name), 'utf8'));
const categoryIds = { educational: 1, intermediate: 2, medium: 2, rare: 3, vip: 4, accessories: 5 };
const accessoryAliases = { picks: ['ريش','ريشة','risha','pick','plectrum'], cases: ['حقيبة','حقائب','case','bag'], keys: ['مفتاح','مفاتيح','key'], strings: ['وتر','أوتار','string'], care: ['عناية','تلميع','تنظيف','care','polish','clean'] };

export default function localReview() {
  return { name: 'local-read-only-review', configureServer(server) {
    server.middlewares.use('/api', (req, res) => {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      const send = (status, data) => { res.statusCode = status; res.end(JSON.stringify(data)); };
      if (req.method !== 'GET') return send(405, { message: 'Local review: no submissions are sent', code: 'LOCAL_REVIEW_READ_ONLY' });
      const url = new URL(req.url, 'http://127.0.0.1');
      try {
        if (url.pathname === '/products') {
          const q = Object.fromEntries(url.searchParams); let products = read('catalog.json').products;
          if (q.category) products = products.filter(p => Number(p.category_id) === categoryIds[q.category]);
          if (q.kind) products = products.filter(p => q.kind === 'accessory' ? Number(p.category_id) === 5 : Number(p.category_id) !== 5);
          if (q.featured) products = products.filter(p => p.is_featured);
          if (q.available) products = products.filter(p => q.available === 'true' ? Number(p.stock)>0 : Number(p.stock)<=0);
          if (q.condition) products = products.filter(p => p.condition_status === q.condition);
          for (const [filter, fields] of [['q',['name_ar','name_en','description_ar','description_en']],['wood',['woods_ar','woods_en']],['country',['origin_country_ar','origin_country_en']]]) {
            if (q[filter]) products = products.filter(p => q[filter].trim().toLowerCase().split(/\s+/).every(term => fields.map(f=>p[f]||'').join(' ').toLowerCase().includes(term)));
          }
          if (q.accessory) { const aliases = accessoryAliases[q.accessory] || [q.accessory]; products = products.filter(p=>aliases.some(a=>[p.name_ar,p.name_en,p.description_ar,p.description_en,p.included_accessories_ar,p.included_accessories_en].join(' ').toLowerCase().includes(a.toLowerCase()))); }
          if (q.sort === 'price_asc') products.sort((a,b)=>Number(a.price)-Number(b.price));
          if (q.sort === 'price_desc') products.sort((a,b)=>Number(b.price)-Number(a.price));
          if (q.sort === 'newest') products.sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at)));
          const total=products.length, limit=Math.min(100,Math.max(1,Number(q.limit)||24)), offset=Math.max(0,Number(q.offset)||0);
          return send(200,{products:products.slice(offset,offset+limit),total,limit,offset});
        }
        if (url.pathname === '/content/settings') return send(200,read('settings.json'));
        if (url.pathname === '/content/pages/home') return send(200,read('home.json'));
        const product=url.pathname.match(/^\/products\/([\w-]+)$/);
        if(product) return send(200,read(`details/product-${product[1]}.json`));
        const page=url.pathname.match(/^\/content\/pages\/([\w-]+)$/);
        if(page) return send(200,read(`details/page-${page[1]}.json`));
        return send(404,{message:'Not available in this local review'});
      } catch { return send(404,{message:'No saved public record for this page'}); }
    });
  }};
}
