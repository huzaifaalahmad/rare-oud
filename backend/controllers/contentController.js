const { validationResult } = require('express-validator');
const db = require('../config/database');
const { audit } = require('../utils/audit');
const AppError = require('../utils/AppError');

const KEY_RE = /^[\w.-]{1,120}$/;
const BLOCK_TYPES = new Set(['text', 'html', 'hero', 'cta', 'faq']);

function fail(req) {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    throw new AppError('Validation failed', 422, 'VALIDATION_ERROR');
  }
}

function cleanKey(value, field) {
  const key = String(value || '').trim();

  if (!KEY_RE.test(key)) {
    throw new AppError(`${field} contains invalid characters`, 422, 'INVALID_CONTENT_KEY');
  }

  return key;
}

function cleanBlockType(value) {
  const type = String(value || 'text').trim();

  return BLOCK_TYPES.has(type) ? type : 'text';
}

function fallbackPage(slug) {
  const pages = {
    home: {
      slug: 'home',
      title_ar: 'العود النادر',
      title_en: 'Rare Oud',
      meta_title_ar: 'العود النادر',
      meta_title_en: 'Rare Oud',
      meta_description_ar: 'منصة فاخرة لاكتشاف وطلب الأعواد الموسيقية النادرة.',
      meta_description_en: 'A luxury platform to discover and request rare musical ouds.',
      content_ar: 'تجربة فاخرة لاكتشاف وطلب الأعواد النادرة.',
      content_en: 'A luxury experience to discover and request rare ouds.',
      is_active: true
    },
    about: {
      slug: 'about',
      title_ar: 'من نحن',
      title_en: 'About Rare Oud',
      meta_title_ar: 'من نحن | العود النادر',
      meta_title_en: 'About | Rare Oud',
      meta_description_ar: 'العود النادر منصة متخصصة في الأعواد الموسيقية الراقية.',
      meta_description_en: 'Rare Oud is a premium platform for fine musical ouds.',
      content_ar: 'العود النادر منصة متخصصة في الأعواد الموسيقية الراقية.',
      content_en: 'Rare Oud is a premium platform for fine musical ouds.',
      is_active: true
    },
    accessories: {
      slug: 'accessories',
      title_ar: 'الأكسسوارات',
      title_en: 'Accessories',
      meta_title_ar: 'الأكسسوارات | العود النادر',
      meta_title_en: 'Accessories | Rare Oud',
      meta_description_ar: 'إكسسوارات مختارة بعناية لعازفي العود.',
      meta_description_en: 'Carefully selected accessories for oud players.',
      content_ar: 'إكسسوارات مختارة بعناية لعازفي العود.',
      content_en: 'Carefully selected accessories for oud players.',
      is_active: true
    },
    shipping: {
      slug: 'shipping',
      title_ar: 'الشحن والتغليف',
      title_en: 'Shipping & Packaging',
      meta_title_ar: 'الشحن والتغليف | العود النادر',
      meta_title_en: 'Shipping & Packaging | Rare Oud',
      meta_description_ar: 'تفاصيل الشحن المحلي والدولي وتغليف الأعواد والإكسسوارات.',
      meta_description_en: 'Local and international shipping with careful oud and accessory packaging.',
      content_ar: 'نشحن داخل سوريا وإلى أنحاء العالم مع تغليف يحمي الآلة من الصدمات والرطوبة قدر الإمكان.',
      content_en: 'We ship inside Syria and internationally with careful packaging for shock and humidity protection.',
      is_active: true
    },
    'return-policy': {
      slug: 'return-policy',
      title_ar: 'سياسة الإرجاع',
      title_en: 'Return Policy',
      meta_title_ar: 'سياسة الإرجاع | العود النادر',
      meta_title_en: 'Return Policy | Rare Oud',
      meta_description_ar: 'سياسة واضحة لطلبات الإرجاع حسب حالة المنتج والفحص عند الاستلام.',
      meta_description_en: 'A clear return policy based on item condition and receiving inspection.',
      content_ar: 'يمكن طلب الإرجاع وفق حالة المنتج، سلامة التغليف، وتوثيق الفحص عند الاستلام.',
      content_en: 'Returns depend on product condition, packaging safety, and receiving inspection.',
      is_active: true
    },
    'after-sales': {
      slug: 'after-sales',
      title_ar: 'خدمات ما بعد البيع',
      title_en: 'After-sales Services',
      meta_title_ar: 'خدمات ما بعد البيع | العود النادر',
      meta_title_en: 'After-sales Services | Rare Oud',
      meta_description_ar: 'دعم بعد البيع للعناية والضبط والنصائح الأساسية بعد الشراء.',
      meta_description_en: 'After-sales care, setup guidance, and basic post-purchase support.',
      content_ar: 'نقدم إرشادات للعناية، الضبط الأولي، ونصائح الحفظ والاستخدام بعد الشراء.',
      content_en: 'We provide care guidance, initial setup tips, and post-purchase support.',
      is_active: true
    },
    packaging: {
      slug: 'packaging',
      title_ar: 'التغليف',
      title_en: 'Packaging',
      meta_title_ar: 'التغليف | العود النادر',
      meta_title_en: 'Packaging | Rare Oud',
      meta_description_ar: 'تغليف مدروس لحماية الأعواد والإكسسوارات أثناء النقل.',
      meta_description_en: 'Careful packaging for ouds and accessories in transit.',
      content_ar: 'نستخدم تغليفاً مناسباً لطبيعة الآلة لتقليل الصدمات والرطوبة أثناء النقل.',
      content_en: 'We use packaging suited to the instrument to reduce shock and humidity exposure in transit.',
      is_active: true
    },
    links: {
      slug: 'links',
      title_ar: 'روابطنا',
      title_en: 'Our Links',
      meta_title_ar: 'روابطنا | العود النادر',
      meta_title_en: 'Links | Rare Oud',
      meta_description_ar: 'تابعنا وتواصل معنا عبر الروابط الرسمية.',
      meta_description_en: 'Follow and contact us through our official links.',
      content_ar: 'تابعنا وتواصل معنا عبر الروابط الرسمية.',
      content_en: 'Follow and contact us through our official links.',
      is_active: true
    }
  };

  return pages[slug] || {
    slug,
    title_ar: 'الصفحة قيد الإعداد',
    title_en: 'Page is being prepared',
    meta_title_ar: 'الصفحة قيد الإعداد',
    meta_title_en: 'Page is being prepared',
    meta_description_ar: 'هذه الصفحة قيد الإعداد.',
    meta_description_en: 'This page is being prepared.',
    content_ar: 'هذه الصفحة قيد الإعداد.',
    content_en: 'This page is being prepared.',
    is_active: true
  };
}

function fallbackBlocks(slug) {
  const blocks = {
    home: [
      {
        block_key: 'home.hero',
        block_type: 'hero',
        content_ar: 'اكتشف أعوادًا نادرة مختارة بعناية لعشاق الصوت الأصيل.',
        content_en: 'Discover rare ouds curated for lovers of authentic sound.'
      },
      {
        block_key: 'home.cta',
        block_type: 'cta',
        content_ar: 'اطلب العود المناسب لك وتواصل معنا مباشرة.',
        content_en: 'Request the oud that fits you and contact us directly.'
      }
    ],
    about: [
      {
        block_key: 'about.story',
        block_type: 'text',
        content_ar: 'نختار كل عود بعناية لنقدّم تجربة موسيقية فاخرة وموثوقة.',
        content_en: 'We carefully curate every oud to offer a premium and trusted musical experience.'
      }
    ],
    accessories: [
      {
        block_key: 'accessories.intro',
        block_type: 'text',
        content_ar: 'مجموعة إكسسوارات عملية وأنيقة للعازفين والمحترفين.',
        content_en: 'A refined collection of practical accessories for players and professionals.'
      }
    ],
    links: [
      {
        block_key: 'links.intro',
        block_type: 'text',
        content_ar: 'كل روابط التواصل الرسمية في مكان واحد.',
        content_en: 'All official contact links in one place.'
      }
    ]
  };

  return blocks[slug] || [];
}

exports.page = async (req, res, next) => {
  try {
    const slug = cleanKey(req.params.slug, 'slug');

    const rows = await db.query(
      'SELECT * FROM editable_pages WHERE slug=:slug AND is_active=TRUE LIMIT 1',
      { slug }
    );

    if (!rows.length) {
      return res.json({
        page: fallbackPage(slug),
        blocks: fallbackBlocks(slug),
        fallback: true
      });
    }

    const page = rows[0];

    const blocks = await db.query(
      `SELECT *
       FROM editable_content_blocks
       WHERE page_id=:id OR block_key LIKE :prefix
       ORDER BY block_key`,
      {
        id: page.id,
        prefix: `${slug}.%`
      }
    );

    return res.json({
      page,
      blocks: blocks.length ? blocks : fallbackBlocks(slug),
      fallback: blocks.length === 0
    });
  } catch (e) {
    next(e);
  }
};

exports.pages = async (_req, res, next) => {
  try {
    const pages = await db.query(
      'SELECT * FROM editable_pages ORDER BY slug'
    );

    res.json({ pages });
  } catch (e) {
    next(e);
  }
};

exports.upsertPage = async (req, res, next) => {
  try {
    fail(req);

    const b = req.body;
    const slug = cleanKey(b.slug, 'slug');

    await db.query(
      `INSERT INTO editable_pages
       (slug,title_ar,title_en,meta_title_ar,meta_title_en,meta_description_ar,meta_description_en,is_active)
       VALUES
       (:slug,:title_ar,:title_en,:meta_title_ar,:meta_title_en,:meta_description_ar,:meta_description_en,:is_active)
       ON DUPLICATE KEY UPDATE
       title_ar=VALUES(title_ar),
       title_en=VALUES(title_en),
       meta_title_ar=VALUES(meta_title_ar),
       meta_title_en=VALUES(meta_title_en),
       meta_description_ar=VALUES(meta_description_ar),
       meta_description_en=VALUES(meta_description_en),
       is_active=VALUES(is_active)`,
      {
        slug,
        title_ar: b.title_ar,
        title_en: b.title_en,
        meta_title_ar: b.meta_title_ar || null,
        meta_title_en: b.meta_title_en || null,
        meta_description_ar: b.meta_description_ar || null,
        meta_description_en: b.meta_description_en || null,
        is_active: b.is_active ?? true
      }
    );

    await audit(req, 'upsert', 'page', slug, b);

    const rows = await db.query(
      'SELECT * FROM editable_pages WHERE slug=:slug LIMIT 1',
      { slug }
    );

    res.json({ message: 'Page saved', page: rows[0] || null });
  } catch (e) {
    next(e);
  }
};

exports.upsertBlock = async (req, res, next) => {
  try {
    fail(req);

    const b = req.body;
    const block_key = cleanKey(b.block_key, 'block_key');
    const block_type = cleanBlockType(b.block_type);

    await db.query(
      `INSERT INTO editable_content_blocks
       (page_id,block_key,content_ar,content_en,block_type)
       VALUES
       (:page_id,:block_key,:content_ar,:content_en,:block_type)
       ON DUPLICATE KEY UPDATE
       page_id=VALUES(page_id),
       content_ar=VALUES(content_ar),
       content_en=VALUES(content_en),
       block_type=VALUES(block_type)`,
      {
        page_id: b.page_id || null,
        block_key,
        content_ar: b.content_ar || null,
        content_en: b.content_en || null,
        block_type
      }
    );

    await audit(req, 'upsert', 'content_block', block_key, {
      ...b,
      block_key,
      block_type
    });

    res.json({ message: 'Block saved' });
  } catch (e) {
    next(e);
  }
};

exports.settings = async (_req, res, next) => {
  try {
    const settings = await db.query(
      'SELECT setting_key,value_ar,value_en,value_json,updated_at FROM site_settings ORDER BY setting_key'
    );

    res.json({ settings });
  } catch (e) {
    next(e);
  }
};

exports.upsertSetting = async (req, res, next) => {
  try {
    fail(req);

    const b = req.body;
    const setting_key = cleanKey(b.setting_key, 'setting_key');

    await db.query(
      `INSERT INTO site_settings
       (setting_key,value_ar,value_en,value_json)
       VALUES
       (:setting_key,:value_ar,:value_en,:value_json)
       ON DUPLICATE KEY UPDATE
       value_ar=VALUES(value_ar),
       value_en=VALUES(value_en),
       value_json=VALUES(value_json)`,
      {
        setting_key,
        value_ar: b.value_ar || null,
        value_en: b.value_en || null,
        value_json: b.value_json
          ? JSON.stringify(b.value_json)
          : null
      }
    );

    await audit(req, 'upsert', 'setting', setting_key, {
      ...b,
      setting_key
    });

    res.json({ message: 'Setting saved' });
  } catch (e) {
    next(e);
  }
};

exports.upsertBlocks = async (req, res, next) => {
  try {
    fail(req);

    const blocks = Array.isArray(req.body.blocks)
      ? req.body.blocks.slice(0, 50)
      : [];

    if (!blocks.length) {
      throw new AppError('blocks array required', 422, 'VALIDATION_ERROR');
    }

    const cleaned = blocks.map(b => ({
      page_id: b.page_id || null,
      block_key: cleanKey(b.block_key, 'block_key'),
      content_ar: b.content_ar || '',
      content_en: b.content_en || '',
      block_type: cleanBlockType(b.block_type)
    }));

    await db.transaction(async conn => {
      for (const b of cleaned) {
        await conn.execute(
          `INSERT INTO editable_content_blocks
           (page_id,block_key,content_ar,content_en,block_type)
           VALUES (?,?,?,?,?)
           ON DUPLICATE KEY UPDATE
           page_id=VALUES(page_id),
           content_ar=VALUES(content_ar),
           content_en=VALUES(content_en),
           block_type=VALUES(block_type)`,
          [
            b.page_id,
            b.block_key,
            b.content_ar,
            b.content_en,
            b.block_type
          ]
        );
      }
    });

    await audit(req, 'batch_upsert', 'content_blocks', null, {
      count: cleaned.length
    });

    res.json({
      message: 'Blocks saved',
      count: cleaned.length
    });
  } catch (e) {
    next(e);
  }
};

exports.deletePage = async (req, res, next) => {
  try {
    fail(req);

    const slug = cleanKey(req.params.slug, 'slug');
    const rows = await db.query(
      'SELECT id FROM editable_pages WHERE slug=:slug LIMIT 1',
      { slug }
    );

    if (!rows.length) {
      return res.status(404).json({
        message: 'Page not found',
        code: 'PAGE_NOT_FOUND'
      });
    }

    const pageId = rows[0].id;

    await db.transaction(async conn => {
      await conn.execute(
        'DELETE FROM editable_content_blocks WHERE page_id=? OR block_key LIKE ?',
        [pageId, `${slug}.%`]
      );
      await conn.execute(
        'DELETE FROM editable_pages WHERE id=?',
        [pageId]
      );
    });

    await audit(req, 'delete', 'page', slug);

    res.json({ message: 'Page deleted' });
  } catch (e) {
    next(e);
  }
};

exports.deleteBlock = async (req, res, next) => {
  try {
    fail(req);

    const blockKey = cleanKey(req.params.blockKey, 'blockKey');
    const result = await db.query(
      'DELETE FROM editable_content_blocks WHERE block_key=:blockKey',
      { blockKey }
    );

    if (!result.affectedRows) {
      return res.status(404).json({
        message: 'Block not found',
        code: 'BLOCK_NOT_FOUND'
      });
    }

    await audit(req, 'delete', 'content_block', blockKey);

    res.json({ message: 'Block deleted' });
  } catch (e) {
    next(e);
  }
};

exports.deleteSetting = async (req, res, next) => {
  try {
    fail(req);

    const settingKey = cleanKey(req.params.settingKey, 'settingKey');
    const result = await db.query(
      'DELETE FROM site_settings WHERE setting_key=:settingKey',
      { settingKey }
    );

    if (!result.affectedRows) {
      return res.status(404).json({
        message: 'Setting not found',
        code: 'SETTING_NOT_FOUND'
      });
    }

    await audit(req, 'delete', 'setting', settingKey);

    res.json({ message: 'Setting deleted' });
  } catch (e) {
    next(e);
  }
};

exports.banners = async (_req, res, next) => {
  try {
    const banners = await db.query(
      'SELECT * FROM banners WHERE is_active=TRUE ORDER BY sort_order ASC, id DESC'
    );

    res.json({ banners });
  } catch (e) {
    next(e);
  }
};

exports.upsertBanner = async (req, res, next) => {
  try {
    fail(req);

    const b = req.body;

    await db.query(
      `INSERT INTO banners
       (id,title_ar,title_en,subtitle_ar,subtitle_en,image_url,link_url,placement,is_active,sort_order)
       VALUES
       (:id,:title_ar,:title_en,:subtitle_ar,:subtitle_en,:image_url,:link_url,:placement,:is_active,:sort_order)
       ON DUPLICATE KEY UPDATE
       title_ar=VALUES(title_ar),
       title_en=VALUES(title_en),
       subtitle_ar=VALUES(subtitle_ar),
       subtitle_en=VALUES(subtitle_en),
       image_url=VALUES(image_url),
       link_url=VALUES(link_url),
       placement=VALUES(placement),
       is_active=VALUES(is_active),
       sort_order=VALUES(sort_order)`,
      {
        id: b.id || null,
        title_ar: b.title_ar || null,
        title_en: b.title_en || null,
        subtitle_ar: b.subtitle_ar || null,
        subtitle_en: b.subtitle_en || null,
        image_url: b.image_url || null,
        link_url: b.link_url || null,
        placement: b.placement || 'home',
        is_active: b.is_active ?? true,
        sort_order: b.sort_order || 0
      }
    );

    await audit(req, 'upsert', 'banner', b.id || null, b);

    res.json({ message: 'Banner saved' });
  } catch (e) {
    next(e);
  }
};

exports.deleteBanner = async (req, res, next) => {
  try {
    await db.query(
      'DELETE FROM banners WHERE id=:id',
      { id: req.params.id }
    );

    await audit(req, 'delete', 'banner', req.params.id);

    res.json({ message: 'Banner deleted' });
  } catch (e) {
    next(e);
  }
};
