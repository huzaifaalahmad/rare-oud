const express = require('express');
const { recordCspReport } = require('../services/cspReportService');
const router = express.Router();
router.post('/csp-report', express.json({ type: ['application/csp-report', 'application/reports+json', 'application/json'], limit: '64kb' }), async (req, res, next) => { try { await recordCspReport(req); res.status(204).end(); } catch (e) { next(e); } });
module.exports = router;
