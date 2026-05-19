const { hasPermission } = require('../middleware/rbac');
const { ROLE_PERMISSIONS, STEP_UP_PERMISSIONS, roleLevel } = require('../config/roles');

describe('centralized RBAC policy', () => {
  test('admin wildcard namespaces grant scoped permissions', () => {
    expect(hasPermission(ROLE_PERMISSIONS.admin, 'products.write')).toBe(true);
    expect(hasPermission(ROLE_PERMISSIONS.admin, 'settings.write')).toBe(true);
  });

  test('manager cannot delete protected resources', () => {
    expect(hasPermission(ROLE_PERMISSIONS.manager, 'products.delete')).toBe(false);
    expect(STEP_UP_PERMISSIONS.has('products.delete')).toBe(true);
  });

  test('role hierarchy separates public users from admins', () => {
    expect(roleLevel('user')).toBeLessThan(roleLevel('admin'));
    expect(roleLevel('super_admin')).toBeGreaterThan(roleLevel('admin'));
  });
});
