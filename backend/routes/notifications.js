const r = require('express').Router();
const { param } = require('express-validator');
const auth = require('../middleware/auth');
const c = require('../controllers/notificationController');
const { notificationLimiter } = require('../middleware/security');

r.use(auth, notificationLimiter);
r.get('/', c.list);
r.get('/unread-count', c.unread);
r.patch('/read-all', c.markAllRead);
r.patch('/:id/read', [param('id').isInt({ min: 1 }).toInt()], c.markRead);
module.exports = r;
