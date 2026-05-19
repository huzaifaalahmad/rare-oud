const favoriteRepository = require('../repositories/favoriteRepository');
const AppError = require('../utils/AppError');

async function ensureProduct(productId) {
  const product = await favoriteRepository.getProduct(productId);
  if (!product) throw new AppError('Product not found', 404, 'PRODUCT_NOT_FOUND');
  return product;
}

async function list(userId) {
  const favorites = await favoriteRepository.listForUser(userId);
  return { favorites, count: favorites.length };
}

async function toggle(userId, productId) {
  await ensureProduct(productId);
  const exists = await favoriteRepository.isFavorite(userId, productId);
  if (exists) await favoriteRepository.remove(userId, productId);
  else await favoriteRepository.add(userId, productId);
  return { favorited: !exists, likes_count: await favoriteRepository.countForProduct(productId) };
}

async function status(userId, productId) {
  await ensureProduct(productId);
  return {
    favorited: await favoriteRepository.isFavorite(userId, productId),
    likes_count: await favoriteRepository.countForProduct(productId)
  };
}

module.exports = { list, toggle, status };
