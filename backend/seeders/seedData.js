require('dotenv').config();

const db = require('../config/database');
const productService = require('../services/productService');

const demoMedia = {
  video: process.env.DEMO_PRODUCT_VIDEO_URL || 'https://drive.google.com/file/d/1zalQpum8jZl9GyOKEjNe7_UNBDiC_P0t/view?usp=sharing',
  audio: process.env.DEMO_PRODUCT_AUDIO_URL || 'https://drive.google.com/drive/folders/0B28Gtf1n8u8DN0NoRlY1VFZoSGM'
};

const categories = [
  { slug: 'educational', name_ar: 'تعليمي', name_en: 'Educational', sort_order: 0 },
  { slug: 'intermediate', name_ar: 'متوسط', name_en: 'Intermediate', sort_order: 1 },
  { slug: 'rare', name_ar: 'نادر', name_en: 'Rare', sort_order: 2 },
  { slug: 'vip', name_ar: 'VIP', name_en: 'VIP', sort_order: 3 },
  { slug: 'accessories', name_ar: 'أكسسوارات', name_en: 'Accessories', sort_order: 4 }
];

const contactEmail = process.env.CONTACT_EMAIL || process.env.ADMIN_EMAIL || '';
const whatsappPhone = String(process.env.WHATSAPP_PHONE || '963981653408').replace(/\D/g, '');
const contactPhone = process.env.CONTACT_PHONE || `+${whatsappPhone}`;
const instagramUrl = process.env.INSTAGRAM_URL || 'https://www.instagram.com/rare.oud.syria?igsh=MTkzamdzODMyaHpkOA%3D%3D&utm_source=qr';
const facebookUrl = process.env.FACEBOOK_URL || 'https://www.facebook.com/share/18WAzB1c7N/?mibextid=wwXIfr';

const settings = [
  { setting_key: 'brand_name', value_ar: 'العود النادر', value_en: 'Rare Oud', value_json: null },
  { setting_key: 'facebook_url', value_ar: null, value_en: null, value_json: JSON.stringify({ url: facebookUrl }) },
  { setting_key: 'instagram_url', value_ar: null, value_en: null, value_json: JSON.stringify({ url: instagramUrl }) },
  { setting_key: 'tiktok_url', value_ar: null, value_en: null, value_json: JSON.stringify({ url: process.env.TIKTOK_URL || '' }) },
  { setting_key: 'whatsapp_phone', value_ar: whatsappPhone, value_en: whatsappPhone, value_json: null },
  { setting_key: 'contact_phone', value_ar: contactPhone, value_en: contactPhone, value_json: null },
  { setting_key: 'contact_email', value_ar: contactEmail, value_en: contactEmail, value_json: null }
];

const shippingZones = [
  {
    name_ar: 'داخل سوريا',
    name_en: 'Inside Syria',
    countries: ['SY'],
    rates: [{ min_weight: 0, max_weight: 9999, rate: 0 }]
  },
  {
    name_ar: 'دول الخليج',
    name_en: 'Gulf Countries',
    countries: ['AE', 'SA', 'QA', 'KW', 'BH', 'OM'],
    rates: [{ min_weight: 0, max_weight: 9999, rate: 25 }]
  },
  {
    name_ar: 'الشحن الدولي',
    name_en: 'International',
    countries: ['JO', 'LB', 'TR', 'IQ', 'EG', 'US', 'CA', 'GB', 'DE', 'FR'],
    rates: [{ min_weight: 0, max_weight: 9999, rate: 35 }]
  }
];

const pages = [
  {
    slug: 'home',
    title_ar: 'العود النادر',
    title_en: 'Rare Oud',
    blocks: [
      ['home.hero.title', 'أعواد مختارة لصوت لا ينسى', 'Rare ouds selected for an unforgettable sound', 'text'],
      ['home.hero.subtitle', 'مجموعة تجريبية فاخرة لاختبار تجربة المتجر والطلبات والمفضلة والتقييمات.', 'A luxury demo catalog for testing storefront, requests, favorites, and reviews.', 'text'],
      ['home.hero.cta', 'تصفح الأعواد', 'Browse ouds', 'text'],
      ['home.policy.shipping.body', 'تغليف آمن وشحن محلي ودولي مع توثيق حالة الآلة قبل الإرسال.', 'Secure packaging and local/international shipping with condition documentation.', 'text'],
      ['home.policy.returns.body', 'سياسة واضحة حسب حالة المنتج والفحص عند الاستلام.', 'Clear return policy based on item condition and receiving inspection.', 'text'],
      ['home.policy.afterSales.body', 'دعم بعد البيع للضبط والنصائح والعناية الأساسية.', 'After-sales support for tuning, care, and basic maintenance.', 'text']
    ]
  },
  {
    slug: 'about',
    title_ar: 'من نحن',
    title_en: 'About',
    body_ar: 'العود النادر تجربة فاخرة لاختيار الأعواد الموسيقية النادرة والإكسسوارات بعناية.',
    body_en: 'Rare Oud is a luxury experience for curated ouds and accessories.'
  },
  {
    slug: 'contact',
    title_ar: 'تواصل معنا',
    title_en: 'Contact',
    body_ar: 'تواصل معنا عبر واتساب أو من خلال طلب المنتج المباشر.',
    body_en: 'Contact us through WhatsApp or direct product requests.'
  },
  {
    slug: 'shipping',
    title_ar: 'الشحن والتغليف',
    title_en: 'Shipping & Packaging',
    body_ar: 'نشحن داخل سوريا وإلى أنحاء العالم مع تغليف يحمي الآلة من الصدمات والرطوبة قدر الإمكان.',
    body_en: 'We ship inside Syria and internationally with careful packaging for shock and humidity protection.'
  },
  {
    slug: 'return-policy',
    title_ar: 'سياسة الإرجاع',
    title_en: 'Return Policy',
    body_ar: 'يمكن طلب الإرجاع وفق حالة المنتج، سلامة التغليف، وتوثيق الفحص عند الاستلام.',
    body_en: 'Returns depend on product condition, packaging safety, and receiving inspection.'
  },
  {
    slug: 'after-sales',
    title_ar: 'خدمات ما بعد البيع',
    title_en: 'After-sales Services',
    body_ar: 'نقدم إرشادات للعناية، الضبط الأولي، ونصائح الحفظ والاستخدام بعد الشراء.',
    body_en: 'We provide care guidance, initial setup tips, and post-purchase support.'
  },
  {
    slug: 'packaging',
    title_ar: 'التغليف',
    title_en: 'Packaging',
    body_ar: 'نستخدم تغليفاً مناسباً لطبيعة الآلة لتقليل الصدمات والرطوبة أثناء النقل.',
    body_en: 'We use packaging suited to the instrument to reduce shock and humidity exposure in transit.'
  }
];

const products = [
  {
    category: 'educational',
    slug: 'damascus-student-oud',
    sku: 'RO-EDU-001',
    name_ar: 'عود دمشقي تعليمي',
    name_en: 'Damascus Student Oud',
    description_ar: 'عود متوازن ومناسب للتعلم اليومي، صوت واضح واستجابة مريحة للمبتدئين.',
    description_en: 'A balanced student oud for daily learning with clear response and comfortable handling.',
    price: 320,
    compare_at_price: 390,
    stock: 8,
    condition_status: 'new',
    dimensions: 'Length 61cm / Bowl 36cm',
    woods_ar: 'جوز، وجه تنوب',
    woods_en: 'Walnut, spruce top',
    included_accessories_ar: 'ريشة، حقيبة مبطنة، أوتار احتياطية',
    included_accessories_en: 'Pick, padded case, spare strings',
    origin_country_ar: 'سوريا',
    origin_country_en: 'Syria',
    maker_identity_ar: 'ورشة دمشقية',
    maker_identity_en: 'Damascus workshop',
    historical_ar: 'مدرسة شرقية تعليمية',
    historical_en: 'Educational Eastern school',
    featured: true
  },
  {
    category: 'intermediate',
    slug: 'aleppo-intermediate-oud',
    sku: 'RO-INT-002',
    name_ar: 'عود حلبي متوسط',
    name_en: 'Aleppo Intermediate Oud',
    description_ar: 'طبقة دافئة وتوازن جيد بين القرار والجواب، مناسب للعازف المتقدم.',
    description_en: 'Warm tone and balanced bass/treble response for progressing players.',
    price: 640,
    compare_at_price: 720,
    stock: 5,
    condition_status: 'new',
    dimensions: 'Length 62cm / Bowl 37cm',
    woods_ar: 'جوز حلبي، وجه أرز',
    woods_en: 'Aleppo walnut, cedar top',
    included_accessories_ar: 'حقيبة، ريشة، طقم أوتار',
    included_accessories_en: 'Case, pick, string set',
    origin_country_ar: 'سوريا',
    origin_country_en: 'Syria',
    maker_identity_ar: 'صانع حلبي',
    maker_identity_en: 'Aleppo maker',
    historical_ar: 'طابع حلبي كلاسيكي',
    historical_en: 'Classic Aleppo character',
    featured: true
  },
  {
    category: 'rare',
    slug: 'rare-walnut-concert-oud',
    sku: 'RO-RARE-003',
    name_ar: 'عود نادر من الجوز',
    name_en: 'Rare Walnut Concert Oud',
    description_ar: 'قطعة مختارة لصوت حفلي عميق وخشب معتق بملمس فاخر.',
    description_en: 'A selected concert piece with deep projection and aged walnut character.',
    price: 1450,
    compare_at_price: 1650,
    stock: 2,
    condition_status: 'used',
    dimensions: 'Length 61.5cm / Bowl 36.5cm',
    woods_ar: 'جوز معتق، أبنوس',
    woods_en: 'Aged walnut, ebony',
    included_accessories_ar: 'حقيبة فاخرة، شهادة فحص، أوتار',
    included_accessories_en: 'Premium case, inspection note, strings',
    origin_country_ar: 'سوريا',
    origin_country_en: 'Syria',
    maker_identity_ar: 'صانع موثق',
    maker_identity_en: 'Documented maker',
    historical_ar: 'تصنيف نادر شرقي',
    historical_en: 'Rare Eastern classification',
    featured: true
  },
  {
    category: 'vip',
    slug: 'vip-inlaid-oud',
    sku: 'RO-VIP-004',
    name_ar: 'عود VIP مطعم',
    name_en: 'VIP Inlaid Oud',
    description_ar: 'عود فاخر مطعم بتفاصيل يدوية وصوت غني يناسب الاقتناء والعزف.',
    description_en: 'A premium inlaid oud with handcrafted details and a rich collectible tone.',
    price: 2800,
    compare_at_price: 3200,
    stock: 1,
    condition_status: 'new',
    dimensions: 'Length 62cm / Bowl 37cm',
    woods_ar: 'أبنوس، جوز، تطعيم صدف',
    woods_en: 'Ebony, walnut, mother-of-pearl inlay',
    included_accessories_ar: 'حقيبة جلدية، شهادة، طقم أوتار فاخر',
    included_accessories_en: 'Leather case, certificate, premium strings',
    origin_country_ar: 'سوريا',
    origin_country_en: 'Syria',
    maker_identity_ar: 'قطعة خاصة',
    maker_identity_en: 'Private selection',
    historical_ar: 'VIP مقتنيات موسيقية',
    historical_en: 'VIP musical collectible',
    featured: true
  },
  {
    category: 'accessories',
    slug: 'premium-oud-risha-set',
    sku: 'RO-ACC-005',
    name_ar: 'طقم ريش عود فاخر',
    name_en: 'Premium Oud Risha Set',
    description_ar: 'مجموعة ريش مريحة للاختبار اليومي وتغيير الإحساس أثناء العزف.',
    description_en: 'A comfortable risha set for daily testing and tonal feel changes.',
    price: 28,
    compare_at_price: null,
    stock: 25,
    condition_status: 'new',
    dimensions: 'Mixed sizes',
    woods_ar: 'مواد مرنة مختارة',
    woods_en: 'Selected flexible materials',
    included_accessories_ar: '5 ريش',
    included_accessories_en: '5 picks',
    origin_country_ar: 'سوريا',
    origin_country_en: 'Syria',
    maker_identity_ar: 'إكسسوارات العود النادر',
    maker_identity_en: 'Rare Oud accessories',
    historical_ar: 'ريش',
    historical_en: 'Picks',
    featured: true
  },
  {
    category: 'accessories',
    slug: 'premium-oud-hard-case',
    sku: 'RO-ACC-006',
    name_ar: 'حقيبة عود صلبة فاخرة',
    name_en: 'Premium Oud Hard Case',
    description_ar: 'حقيبة حماية صلبة مبطنة للعود مع قفل آمن ومقبض مريح للتنقل والعروض.',
    description_en: 'A padded hard case for oud protection with secure locks and a comfortable carry handle.',
    price: 145,
    compare_at_price: 175,
    stock: 12,
    condition_status: 'new',
    dimensions: 'Fits 60-63cm ouds',
    woods_ar: 'هيكل صلب مبطن',
    woods_en: 'Padded rigid shell',
    included_accessories_ar: 'حزام كتف ومفتاحان',
    included_accessories_en: 'Shoulder strap and two keys',
    origin_country_ar: 'سوريا',
    origin_country_en: 'Syria',
    maker_identity_ar: 'إكسسوارات العود النادر',
    maker_identity_en: 'Rare Oud accessories',
    historical_ar: 'حقائب ومفاتيح',
    historical_en: 'Cases and keys',
    featured: false
  },
  {
    category: 'accessories',
    slug: 'professional-oud-strings',
    sku: 'RO-ACC-007',
    name_ar: 'طقم أوتار عود احترافي',
    name_en: 'Professional Oud Strings',
    description_ar: 'طقم أوتار متوازن للاستجابة السريعة ونقاء الطبقات، مناسب للتجربة اليومية والتسجيل.',
    description_en: 'A balanced oud string set for quick response and clear register separation.',
    price: 42,
    compare_at_price: null,
    stock: 30,
    condition_status: 'new',
    dimensions: 'Arabic tuning set',
    woods_ar: 'نايلون ومعدن ملفوف',
    woods_en: 'Nylon and wound metal',
    included_accessories_ar: 'طقم كامل من 11 وتر',
    included_accessories_en: 'Complete 11-string set',
    origin_country_ar: 'سوريا',
    origin_country_en: 'Syria',
    maker_identity_ar: 'إكسسوارات العود النادر',
    maker_identity_en: 'Rare Oud accessories',
    historical_ar: 'أوتار',
    historical_en: 'Strings',
    featured: false
  },
  {
    category: 'accessories',
    slug: 'oud-care-polish-kit',
    sku: 'RO-ACC-008',
    name_ar: 'مجموعة عناية وتلميع للعود',
    name_en: 'Oud Care & Polish Kit',
    description_ar: 'مجموعة عناية لطيفة لتنظيف سطح العود وحماية الخشب من الغبار وآثار الاستخدام.',
    description_en: 'A gentle care kit for cleaning oud surfaces and protecting the wood from dust and handling marks.',
    price: 36,
    compare_at_price: 48,
    stock: 18,
    condition_status: 'new',
    dimensions: 'Compact kit',
    woods_ar: 'منظف لطيف وقماش مايكروفايبر',
    woods_en: 'Gentle cleaner and microfiber cloth',
    included_accessories_ar: 'سائل عناية، قماش، فرشاة ناعمة',
    included_accessories_en: 'Care fluid, cloth, soft brush',
    origin_country_ar: 'سوريا',
    origin_country_en: 'Syria',
    maker_identity_ar: 'إكسسوارات العود النادر',
    maker_identity_en: 'Rare Oud accessories',
    historical_ar: 'عناية',
    historical_en: 'Care',
    featured: false
  },
  {
    category: 'rare',
    slug: 'baghdad-rosewood-oud',
    sku: 'RO-RARE-009',
    name_ar: 'عود روزوود بغدادي',
    name_en: 'Baghdad Rosewood Oud',
    description_ar: 'صوت داكن وطابع تاريخي مستوحى من المدرسة البغدادية.',
    description_en: 'A darker voice with a historic profile inspired by the Baghdad school.',
    price: 1180,
    compare_at_price: 1320,
    stock: 3,
    condition_status: 'used',
    dimensions: 'Length 61cm / Bowl 36cm',
    woods_ar: 'روزدود، وجه تنوب',
    woods_en: 'Rosewood, spruce top',
    included_accessories_ar: 'حقيبة، أوتار',
    included_accessories_en: 'Case, strings',
    origin_country_ar: 'العراق',
    origin_country_en: 'Iraq',
    maker_identity_ar: 'مدرسة بغداد',
    maker_identity_en: 'Baghdad school',
    historical_ar: 'تصنيف بغدادي',
    historical_en: 'Baghdad classification',
    featured: false
  }
];

async function upsertPage(conn, page) {
  await conn.execute(
    `INSERT INTO editable_pages (slug, title_ar, title_en, meta_title_ar, meta_title_en, meta_description_ar, meta_description_en, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, TRUE)
     ON DUPLICATE KEY UPDATE
       title_ar = VALUES(title_ar),
       title_en = VALUES(title_en),
       meta_title_ar = VALUES(meta_title_ar),
       meta_title_en = VALUES(meta_title_en),
       meta_description_ar = VALUES(meta_description_ar),
       meta_description_en = VALUES(meta_description_en),
       is_active = TRUE`,
    [
      page.slug,
      page.title_ar,
      page.title_en,
      page.title_ar,
      page.title_en,
      page.body_ar || page.title_ar,
      page.body_en || page.title_en
    ]
  );

  const [rows] = await conn.execute('SELECT id FROM editable_pages WHERE slug=? LIMIT 1', [page.slug]);
  const pageId = rows[0].id;

  if (page.body_ar || page.body_en) {
    await conn.execute(
      `INSERT INTO editable_content_blocks (page_id, block_key, content_ar, content_en, block_type)
       VALUES (?, ?, ?, ?, 'text')
       ON DUPLICATE KEY UPDATE
         page_id = VALUES(page_id),
         content_ar = VALUES(content_ar),
         content_en = VALUES(content_en),
         block_type = VALUES(block_type)`,
      [pageId, `${page.slug}.body`, page.body_ar || '', page.body_en || '']
    );
  }

  for (const block of page.blocks || []) {
    await conn.execute(
      `INSERT INTO editable_content_blocks (page_id, block_key, content_ar, content_en, block_type)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         page_id = VALUES(page_id),
         content_ar = VALUES(content_ar),
         content_en = VALUES(content_en),
         block_type = VALUES(block_type)`,
      [pageId, block[0], block[1], block[2], block[3]]
    );
  }
}

async function upsertProduct(conn, categoryIds, product) {
  await conn.execute(
    `INSERT INTO products (
       category_id, slug, sku, name_ar, name_en, description_ar, description_en,
       price, compare_at_price, stock, condition_status, dimensions,
       woods_ar, woods_en, included_accessories_ar, included_accessories_en,
       origin_country_ar, origin_country_en, maker_identity_ar, maker_identity_en,
       historical_geographic_classification_ar, historical_geographic_classification_en,
       is_featured, is_active
     )
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)
     ON DUPLICATE KEY UPDATE
       category_id = VALUES(category_id),
       sku = VALUES(sku),
       name_ar = VALUES(name_ar),
       name_en = VALUES(name_en),
       description_ar = VALUES(description_ar),
       description_en = VALUES(description_en),
       price = VALUES(price),
       compare_at_price = VALUES(compare_at_price),
       stock = VALUES(stock),
       condition_status = VALUES(condition_status),
       dimensions = VALUES(dimensions),
       woods_ar = VALUES(woods_ar),
       woods_en = VALUES(woods_en),
       included_accessories_ar = VALUES(included_accessories_ar),
       included_accessories_en = VALUES(included_accessories_en),
       origin_country_ar = VALUES(origin_country_ar),
       origin_country_en = VALUES(origin_country_en),
       maker_identity_ar = VALUES(maker_identity_ar),
       maker_identity_en = VALUES(maker_identity_en),
       historical_geographic_classification_ar = VALUES(historical_geographic_classification_ar),
       historical_geographic_classification_en = VALUES(historical_geographic_classification_en),
       is_featured = VALUES(is_featured),
       is_active = TRUE,
       deleted_at = NULL`,
    [
      categoryIds[product.category],
      product.slug,
      product.sku,
      product.name_ar,
      product.name_en,
      product.description_ar,
      product.description_en,
      product.price,
      product.compare_at_price,
      product.stock,
      product.condition_status,
      product.dimensions,
      product.woods_ar,
      product.woods_en,
      product.included_accessories_ar,
      product.included_accessories_en,
      product.origin_country_ar,
      product.origin_country_en,
      product.maker_identity_ar,
      product.maker_identity_en,
      product.historical_ar,
      product.historical_en,
      product.featured
    ]
  );

  const [rows] = await conn.execute('SELECT id FROM products WHERE slug=? LIMIT 1', [product.slug]);
  const productId = rows[0]?.id;

  if (productId && product.category !== 'accessories') {
    const mediaRows = [
      ['video', 'فيديو العود', 'Oud video', product.video_url || demoMedia.video],
      ['audio', 'صوت العود', 'Oud audio', product.audio_url || demoMedia.audio]
    ].filter(([, , , url]) => url);

    for (const [mediaType, titleAr, titleEn, driveUrl] of mediaRows) {
      await conn.execute(
        'DELETE FROM product_media_links WHERE product_id=? AND media_type=?',
        [productId, mediaType]
      );

      await conn.execute(
        `INSERT INTO product_media_links (product_id, media_type, title_ar, title_en, drive_url)
         VALUES (?, ?, ?, ?, ?)`,
        [productId, mediaType, titleAr, titleEn, driveUrl]
      );
    }
  }
}

async function upsertShipping(conn) {
  for (const zone of shippingZones) {
    const [existingRows] = await conn.execute('SELECT id FROM shipping_zones WHERE name_en=? LIMIT 1', [zone.name_en]);
    let zoneId = existingRows[0]?.id;

    if (zoneId) {
      await conn.execute(
        'UPDATE shipping_zones SET name_ar=?, name_en=?, countries=?, is_active=TRUE WHERE id=?',
        [zone.name_ar, zone.name_en, JSON.stringify(zone.countries), zoneId]
      );
    } else {
      const [inserted] = await conn.execute(
        'INSERT INTO shipping_zones (name_ar, name_en, countries, is_active) VALUES (?, ?, ?, TRUE)',
        [zone.name_ar, zone.name_en, JSON.stringify(zone.countries)]
      );
      zoneId = inserted.insertId;
    }

    await conn.execute('DELETE FROM shipping_rates WHERE zone_id=?', [zoneId]);
    for (const rate of zone.rates) {
      await conn.execute(
        'INSERT INTO shipping_rates (zone_id, min_weight, max_weight, rate) VALUES (?, ?, ?, ?)',
        [zoneId, rate.min_weight, rate.max_weight, rate.rate]
      );
    }
  }
}

(async () => {
  await db.transaction(async (conn) => {
    for (const category of categories) {
      await conn.execute(
        `INSERT INTO categories (slug, name_ar, name_en, sort_order)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           name_ar = VALUES(name_ar),
           name_en = VALUES(name_en),
           sort_order = VALUES(sort_order)`,
        [category.slug, category.name_ar, category.name_en, category.sort_order]
      );
    }

    const [categoryRows] = await conn.execute('SELECT id, slug FROM categories');
    const categoryIds = Object.fromEntries(categoryRows.map(row => [row.slug, row.id]));

    for (const setting of settings) {
      await conn.execute(
        `INSERT INTO site_settings (setting_key, value_ar, value_en, value_json)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           value_ar = VALUES(value_ar),
           value_en = VALUES(value_en),
           value_json = VALUES(value_json)`,
        [setting.setting_key, setting.value_ar, setting.value_en, setting.value_json]
      );
    }

    for (const page of pages) {
      await upsertPage(conn, page);
    }

    for (const product of products) {
      await upsertProduct(conn, categoryIds, product);
    }

    await upsertShipping(conn);
  });

  await productService.invalidateProductCache();
  await db.pool.end();
  console.log(`Demo catalog seeded: ${categories.length} categories, ${products.length} products, ${pages.length} pages`);
  process.exit(0);
})().catch(async (error) => {
  console.error(error);
  try { await db.pool.end(); } catch {}
  process.exit(1);
});
