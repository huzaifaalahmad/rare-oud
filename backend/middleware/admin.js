const { requireAdmin, requirePermission } = require('./rbac');
module.exports = requireAdmin;
module.exports.requirePermission = requirePermission;
