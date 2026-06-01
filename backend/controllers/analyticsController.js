const logger = require('../utils/logger');
const { recordSiteVisit } = require('../services/siteVisitService');

exports.recordVisit = async (req, res) => {
  try {
    await recordSiteVisit(req, req.body || {});
  } catch (error) {
    logger.warn('Site visit tracking failed', {
      error: error.message,
      requestId: req.id || null
    });
  }

  res.status(204).end();
};
