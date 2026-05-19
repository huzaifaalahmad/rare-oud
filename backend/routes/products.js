const r = require('express').Router();
const c = require('../controllers/productController');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const { requirePermission } = admin;
const { body } = require('express-validator');
const { upload, persistValidatedImages } = require('../config/multer');

r.get('/', c.listValidate, c.list);
r.get('/:slug', c.get);
r.post('/', auth, requirePermission('products.write'), c.validate, c.create);
r.put('/:id', auth, requirePermission('products.write'), c.validate, c.update);
r.delete('/:id', auth, requirePermission('products.delete'), c.remove);
r.post('/:id/images', auth, requirePermission('media.write'), upload.array('images', 8), persistValidatedImages, c.addImages);
r.delete('/:id/images/:imageId', auth, requirePermission('media.write'), c.deleteImage);
r.post('/:id/media', auth, requirePermission('media.write'), [body('media_type').isIn(['audio','video']), body('drive_url').isURL({ protocols: ['https'], require_protocol: true }).custom(v => { if (!/^https:\/\/(drive|docs)\.google\.com\//i.test(v)) throw new Error('Only Google Drive URLs are allowed'); return true; }), body('title_ar').optional({ checkFalsy: true }).trim().isLength({ max: 180 }).escape(), body('title_en').optional({ checkFalsy: true }).trim().isLength({ max: 180 }).escape()], c.addMedia);
module.exports = r;
