const r = require('express').Router();
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const { requirePermission } = admin;
const c = require('../controllers/adminController');

r.use(auth, admin);
r.get('/analytics', requirePermission('analytics.read'), c.analytics);
r.get('/activity', requirePermission('audit.read'), c.activity);
r.get('/media', requirePermission('media.read'), c.mediaLibrary);
r.get('/media/upload-audit', requirePermission('audit.read'), c.uploadAudit);
r.get('/system/health', requirePermission('analytics.read'), c.systemHealth);
r.get('/system/queues', requirePermission('analytics.read'), c.queueStats);
r.post('/system/queues/:name/retry-failed', requirePermission('analytics.read'), c.retryFailedJobs);
r.post('/system/queues/:name/replay-dead-letter', requirePermission('analytics.read'), c.replayDeadLetterJobs);
r.post('/bulk/products', requirePermission('products.write'), c.bulkProducts);
module.exports = r;
