const r = require('express').Router();
const { body, param } = require('express-validator');
const c = require('../controllers/contentController');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const { requirePermission } = admin;

const key = field =>
  body(field)
    .trim()
    .isLength({ min: 1, max: 120 })
    .matches(/^[\w.-]+$/)
    .withMessage(`${field} contains invalid characters`);

const paramKey = field =>
  param(field)
    .trim()
    .isLength({ min: 1, max: 120 })
    .matches(/^[\w.-]+$/)
    .withMessage(`${field} contains invalid characters`);

const optionalText = (field, max = 20000) =>
  body(field)
    .optional({ checkFalsy: true })
    .isString()
    .isLength({ max });

const pageValidation = [
  key('slug'),
  body('title_ar').trim().isLength({ min: 1, max: 220 }).escape(),
  body('title_en').trim().isLength({ min: 1, max: 220 }).escape(),
  optionalText('meta_title_ar', 220),
  optionalText('meta_title_en', 220),
  optionalText('meta_description_ar', 2000),
  optionalText('meta_description_en', 2000),
  body('is_active').optional().isBoolean().toBoolean()
];

const blockValidation = [
  body('page_id').optional({ nullable: true }).isInt({ min: 1 }).toInt(),
  key('block_key'),
  optionalText('content_ar'),
  optionalText('content_en'),
  body('block_type').optional().isIn(['text', 'html', 'hero', 'cta', 'faq'])
];

const blocksValidation = [
  body('blocks').isArray({ min: 1, max: 50 }),
  body('blocks.*.page_id').optional({ nullable: true }).isInt({ min: 1 }).toInt(),
  body('blocks.*.block_key')
    .trim()
    .isLength({ min: 1, max: 120 })
    .matches(/^[\w.-]+$/),
  body('blocks.*.content_ar').optional({ checkFalsy: true }).isString().isLength({ max: 20000 }),
  body('blocks.*.content_en').optional({ checkFalsy: true }).isString().isLength({ max: 20000 }),
  body('blocks.*.block_type').optional().isIn(['text', 'html', 'hero', 'cta', 'faq'])
];

const settingValidation = [
  key('setting_key'),
  optionalText('value_ar', 5000),
  optionalText('value_en', 5000),
  body('value_json').optional({ nullable: true }).custom(v => typeof v === 'object')
];

const bannerValidation = [
  body('id').optional({ checkFalsy: true }).isInt({ min: 1 }).toInt(),
  optionalText('title_ar', 220),
  optionalText('title_en', 220),
  optionalText('subtitle_ar', 2000),
  optionalText('subtitle_en', 2000),
  optionalText('image_url', 500),
  optionalText('link_url', 500),
  body('placement')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 80 })
    .matches(/^[\w.-]+$/),
  body('is_active').optional().isBoolean().toBoolean(),
  body('sort_order').optional().isInt({ min: 0, max: 9999 }).toInt()
];

r.get('/banners', c.banners);
r.get('/pages', c.pages);
r.get(
  '/pages/:slug',
  [
    param('slug')
      .trim()
      .isLength({ min: 1, max: 120 })
      .matches(/^[\w.-]+$/)
  ],
  c.page
);
r.get('/settings', c.settings);

r.put('/pages', auth, requirePermission('content.write'), pageValidation, c.upsertPage);
r.put('/blocks', auth, requirePermission('content.write'), blockValidation, c.upsertBlock);
r.put('/blocks/batch', auth, requirePermission('content.write'), blocksValidation, c.upsertBlocks);
r.put('/settings', auth, requirePermission('settings.write'), settingValidation, c.upsertSetting);
r.put('/banners', auth, requirePermission('content.write'), bannerValidation, c.upsertBanner);
r.delete('/pages/:slug', auth, requirePermission('content.write'), [paramKey('slug')], c.deletePage);
r.delete('/blocks/:blockKey', auth, requirePermission('content.write'), [paramKey('blockKey')], c.deleteBlock);
r.delete('/settings/:settingKey', auth, requirePermission('settings.write'), [paramKey('settingKey')], c.deleteSetting);
r.delete('/banners/:id', auth, requirePermission('content.write'), [param('id').isInt({ min: 1 }).toInt()], c.deleteBanner);

module.exports = r;
