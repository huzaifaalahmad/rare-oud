const favoriteService = require('../services/favoriteService');

exports.list = async (req, res, next) => {
  try {
    res.json(await favoriteService.list(req.user.id));
  } catch (e) { next(e); }
};

exports.toggle = async (req, res, next) => {
  try {
    const result = await favoriteService.toggle(req.user.id, Number(req.params.productId));
    res.status(result.favorited ? 201 : 200).json(result);
  } catch (e) { next(e); }
};

exports.status = async (req, res, next) => {
  try {
    res.json(await favoriteService.status(req.user.id, Number(req.params.productId)));
  } catch (e) { next(e); }
};
