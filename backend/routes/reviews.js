const r = require('express').Router();
const { body, param } = require('express-validator');
const c = require('../controllers/reviewController');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const { requirePermission } = admin;
const { reviewLimiter } = require('../middleware/security');

r.post('/products/:productId', auth, reviewLimiter, c.createProductReview);
r.get('/admin', auth, requirePermission('reviews.read'), c.adminList);
r.get('/site/admin', auth, requirePermission('reviews.read'), c.adminSiteList);
r.patch('/site/:id/approve', auth, requirePermission('reviews.write'), [param('id').isInt({ min: 1 }), body('approved').optional().isBoolean().toBoolean()], c.approveSite);
r.delete('/site/:id', auth, requirePermission('reviews.delete'), [param('id').isInt({ min: 1 })], c.removeSite);
r.patch('/:id/approve', auth, requirePermission('reviews.write'), [param('id').isInt({ min: 1 }), body('approved').optional().isBoolean().toBoolean()], c.approve);
r.delete('/:id', auth, requirePermission('reviews.delete'), [param('id').isInt({ min: 1 })], c.remove);
module.exports = r;
