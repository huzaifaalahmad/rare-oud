const db = require('../config/database');

const SAFE_SORTS = new Map([
  ['newest', 'p.created_at DESC'],
  ['price_asc', 'p.price ASC'],
  ['price_desc', 'p.price DESC'],
  ['featured', 'p.is_featured DESC, p.created_at DESC']
]);

const ACCESSORY_ALIASES = {
  picks: ['ريش', 'ريشة', 'risha', 'pick', 'picks', 'plectrum'],
  risha: ['ريش', 'ريشة', 'risha', 'pick', 'picks', 'plectrum'],
  cases: ['حقيبة', 'حقائب', 'case', 'cases', 'bag', 'bags'],
  bags: ['حقيبة', 'حقائب', 'case', 'cases', 'bag', 'bags'],
  keys: ['مفتاح', 'مفاتيح', 'key', 'keys'],
  strings: ['وتر', 'أوتار', 'string', 'strings'],
  care: ['عناية', 'تلميع', 'تنظيف', 'care', 'polish', 'clean']
};

function buildFilters(query = {}) {
  const where = ['p.deleted_at IS NULL', 'p.is_active=TRUE'];
  const params = {
    limit: Math.min(Number(query.limit || 24), 100),
    offset: Math.max(Number(query.offset || 0), 0)
  };

  if (query.category) {
    where.push('c.slug=:category');
    params.category = String(query.category).slice(0, 120);
  }

  const q = typeof query.q === 'string' ? query.q.trim().slice(0, 200) : '';
  if (q) {
    const terms = q
      .replace(/[+\-<>()~*"@]/g, ' ')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 6);

    terms.forEach((term, index) => {
      const key = `search${index}`;
      params[key] = `%${term.replace(/[\%_]/g, '')}%`;
      where.push(`(
        p.name_ar LIKE :${key}
        OR p.name_en LIKE :${key}
        OR p.description_ar LIKE :${key}
        OR p.description_en LIKE :${key}
      )`);
    });
  }

  if (query.min_price !== undefined && query.min_price !== '') {
    where.push('p.price>=:min_price');
    params.min_price = Number(query.min_price);
  }
  if (query.max_price !== undefined && query.max_price !== '') {
    where.push('p.price<=:max_price');
    params.max_price = Number(query.max_price);
  }
  if (query.condition) {
    where.push('p.condition_status=:condition');
    params.condition = String(query.condition).slice(0, 20);
  }
  if (query.available === 'true') where.push('p.stock>0');
  if (query.featured === '1' || query.featured === 'true') where.push('p.is_featured=TRUE');
  if (query.country) {
    const country = String(query.country).slice(0, 60).replace(/[\%_]/g, '');
    where.push('(p.origin_country_ar LIKE :country OR p.origin_country_en LIKE :country)');
    params.country = `%${country}%`;
  }
  if (query.wood) {
    const wood = String(query.wood).slice(0, 60).replace(/[\%_]/g, '');
    where.push('(p.woods_ar LIKE :wood OR p.woods_en LIKE :wood)');
    params.wood = `%${wood}%`;
  }
  if (query.accessory) {
    const value = String(query.accessory).trim().slice(0, 80).replace(/[\%_]/g, '');
    const aliases = (ACCESSORY_ALIASES[value.toLowerCase()] || [value]).filter(Boolean).slice(0, 8);
    const clauses = aliases.map((alias, index) => {
      const key = `accessory${index}`;
      params[key] = `%${alias}%`;
      return [
        `p.name_ar LIKE :${key}`,
        `p.name_en LIKE :${key}`,
        `p.description_ar LIKE :${key}`,
        `p.description_en LIKE :${key}`,
        `p.included_accessories_ar LIKE :${key}`,
        `p.included_accessories_en LIKE :${key}`,
        `p.historical_geographic_classification_ar LIKE :${key}`,
        `p.historical_geographic_classification_en LIKE :${key}`
      ].join(' OR ');
    });

    if (clauses.length) where.push(`(${clauses.map(clause => `(${clause})`).join(' OR ')})`);
  }

  return { whereSql: where.join(' AND '), params, sortSql: SAFE_SORTS.get(query.sort) || SAFE_SORTS.get('featured') };
}

function productSelect() {
  return `p.*,
    c.name_ar category_name_ar,
    c.name_en category_name_en,
    pi.image_url primary_image,
    COALESCE(fs.likes_count, 0) likes_count,
    fs.avg_rating avg_rating,
    COALESCE(fs.review_count, 0) review_count`;
}

function productJoins() {
  return `
    JOIN categories c ON c.id=p.category_id
    LEFT JOIN (
      SELECT ranked.product_id, ranked.image_url
      FROM (
        SELECT product_id, image_url,
               ROW_NUMBER() OVER (PARTITION BY product_id ORDER BY is_primary DESC, sort_order ASC, id ASC) AS rn
        FROM product_images
      ) ranked
      WHERE ranked.rn=1
    ) pi ON pi.product_id=p.id
    LEFT JOIN (
      SELECT p0.id product_id,
             COUNT(DISTINCT f.user_id) likes_count,
             ROUND(AVG(CASE WHEN r.is_approved=TRUE AND r.deleted_at IS NULL THEN r.rating END), 1) avg_rating,
             COUNT(DISTINCT CASE WHEN r.is_approved=TRUE AND r.deleted_at IS NULL THEN r.id END) review_count
      FROM products p0
      LEFT JOIN favorites f ON f.product_id=p0.id
      LEFT JOIN product_reviews r ON r.product_id=p0.id
      GROUP BY p0.id
    ) fs ON fs.product_id=p.id`;
}

async function listProducts(query) {
  const { whereSql, params, sortSql } = buildFilters(query);
  const { limit, offset, ...sqlParams } = params;
  const rows = await db.query(
    `SELECT ${productSelect()}
     FROM products p
     ${productJoins()}
     WHERE ${whereSql}
     ORDER BY ${sortSql}
     LIMIT ${limit} OFFSET ${offset}`,
    sqlParams
  );
  const countRows = await db.query(
    `SELECT COUNT(*) total FROM products p JOIN categories c ON c.id=p.category_id WHERE ${whereSql}`,
    sqlParams
  );
  return { products: rows, total: countRows[0]?.total || 0, limit, offset };
}

async function findBySlug(slug) {
  const rows = await db.query(
    `SELECT ${productSelect()}
     FROM products p
     ${productJoins()}
     WHERE p.slug=:slug AND p.deleted_at IS NULL
     LIMIT 1`,
    { slug }
  );
  return rows[0] || null;
}

async function getProductDetail(productId) {
  const [images, media, reviews] = await Promise.all([
    db.query('SELECT * FROM product_images WHERE product_id=:id ORDER BY is_primary DESC,sort_order ASC', { id: productId }),
    db.query('SELECT * FROM product_media_links WHERE product_id=:id', { id: productId }),
    db.query(`SELECT r.id,r.rating,r.comment,r.created_at,u.name
              FROM product_reviews r
              JOIN users u ON u.id=r.user_id
              WHERE r.product_id=:id AND r.is_approved=TRUE AND r.deleted_at IS NULL
              ORDER BY r.created_at DESC`, { id: productId })
  ]);
  return { images, media, reviews };
}

async function exists(productId) {
  const rows = await db.query('SELECT id FROM products WHERE id=:id AND deleted_at IS NULL LIMIT 1', { id: productId });
  return Boolean(rows.length);
}

module.exports = { listProducts, findBySlug, getProductDetail, exists };
