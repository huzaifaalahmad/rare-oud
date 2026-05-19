const productRepository = require('../repositories/productRepository');
const AppError = require('../utils/AppError');
const cache = require('../utils/cache');

const PRODUCT_CACHE_PREFIX = 'products:v2';

function cacheTtlSeconds(secondsKey, millisecondsKey, fallbackSeconds) {
  if (process.env[secondsKey]) {
    return Math.max(1, Number(process.env[secondsKey]) || fallbackSeconds);
  }

  if (process.env[millisecondsKey]) {
    return Math.max(1, Math.ceil((Number(process.env[millisecondsKey]) || fallbackSeconds * 1000) / 1000));
  }

  return fallbackSeconds;
}

async function listProducts(query) {
  const key = `${PRODUCT_CACHE_PREFIX}:list:${JSON.stringify(query || {})}`;
  return cache.remember(
    key,
    () => productRepository.listProducts(query),
    cacheTtlSeconds('PRODUCT_LIST_CACHE_TTL_SECONDS', 'PRODUCT_LIST_CACHE_TTL_MS', 30)
  );
}

async function getProductBySlug(slug) {
  const cached = await cache.remember(`${PRODUCT_CACHE_PREFIX}:detail:${slug}`, async () => {
    const product = await productRepository.findBySlug(slug);
    if (!product) throw new AppError('Product not found', 404, 'PRODUCT_NOT_FOUND');
    const detail = await productRepository.getProductDetail(product.id);
    return { product, ...detail };
  }, cacheTtlSeconds('PRODUCT_DETAIL_CACHE_TTL_SECONDS', 'PRODUCT_DETAIL_CACHE_TTL_MS', 30));
  return cached;
}

async function invalidateProductCache() {
  await cache.delPrefix('products:');
}

module.exports = { listProducts, getProductBySlug, invalidateProductCache };
