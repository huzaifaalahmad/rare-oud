require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('../config/database');

const permissions = [
  '*',
  'analytics.read',
  'audit.read',
  'products.read',
  'products.write',
  'products.delete',
  'categories.write',
  'categories.delete',
  'orders.read',
  'orders.write',
  'custom_orders.read',
  'custom_orders.write',
  'contact_messages.read',
  'contact_messages.write',
  'users.read',
  'users.write',
  'users.delete',
  'content.write',
  'settings.write',
  'reviews.read',
  'reviews.write',
  'reviews.delete',
  'media.read',
  'media.write'
];

(async () => {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME || 'Rare Oud Admin';
  if (!email || !password) throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD are required');
  const hash = await bcrypt.hash(password, 12);
  await db.transaction(async (conn) => {
    await conn.execute('INSERT INTO users (name,email,password_hash,role,is_active,deleted_at) VALUES (?,?,?,?,TRUE,NULL) ON DUPLICATE KEY UPDATE name=VALUES(name), password_hash=VALUES(password_hash), role="admin", is_active=TRUE, deleted_at=NULL, token_version=token_version+1', [name, email, hash, 'admin']);
    const [rows] = await conn.execute('SELECT id FROM users WHERE email=? LIMIT 1', [email]);
    const adminId = rows[0].id;
    await conn.execute('UPDATE refresh_tokens SET revoked_at=NOW() WHERE user_id=? AND revoked_at IS NULL', [adminId]);
    for (const permission of permissions) {
      await conn.execute('INSERT IGNORE INTO admin_permissions (user_id, permission) VALUES (?,?)', [adminId, permission]);
    }
  });
  console.log('Admin user and permissions seeded:', email);
  process.exit(0);
})().catch((e) => { console.error(e.message); process.exit(1); });
