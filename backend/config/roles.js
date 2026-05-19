const ROLE_HIERARCHY = Object.freeze({
  user: 0,
  customer: 0,
  support: 10,
  manager: 20,
  admin: 30,
  super_admin: 40
});

const ROLE_PERMISSIONS = Object.freeze({
  user: [],
  customer: [],
  support: [
    'orders.read',
    'custom_orders.read',
    'contact_messages.read',
    'reviews.read',
    'notifications.read'
  ],
  manager: [
    'analytics.read',
    'audit.read',
    'orders.read',
    'orders.write',
    'custom_orders.read',
    'custom_orders.write',
    'contact_messages.read',
    'contact_messages.write',
    'reviews.read',
    'reviews.write',
    'media.read',
    'media.write',
    'products.read',
    'products.write',
    'categories.write',
    'notifications.read',
    'content.write',
    'settings.read'
  ],
  admin: [
    'analytics.read', 'audit.read',
    'orders.*', 'custom_orders.*', 'contact_messages.*', 'reviews.*', 'media.*',
    'products.*', 'categories.*', 'notifications.*', 'content.*',
    'settings.*', 'users.read'
  ],
  super_admin: ['*']
});

const STEP_UP_PERMISSIONS = new Set([
  'products.delete',
  'categories.delete',
  'users.write',
  'users.delete',
  'settings.write',
  'media.delete',
  'reviews.delete',
  'system.write',
  'orders.delete'
]);

function roleLevel(role) {
  return ROLE_HIERARCHY[role] ?? -1;
}

module.exports = { ROLE_HIERARCHY, ROLE_PERMISSIONS, STEP_UP_PERMISSIONS, roleLevel };