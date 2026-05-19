require('dotenv').config();

const db = require('../config/database');

const baseUrl = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 5000}`;

function createClient() {
  const jar = {};
  let csrfToken = '';

  function storeCookies(res) {
    const values = typeof res.headers.getSetCookie === 'function'
      ? res.headers.getSetCookie()
      : (res.headers.get('set-cookie') ? [res.headers.get('set-cookie')] : []);

    for (const header of values.flatMap(value => String(value).split(/,(?=\s*[^;=]+=[^;]+)/))) {
      const pair = header.split(';')[0];
      const index = pair.indexOf('=');
      if (index > 0) jar[pair.slice(0, index).trim()] = pair.slice(index + 1).trim();
    }
  }

  function cookieHeader() {
    return Object.entries(jar).map(([key, value]) => `${key}=${value}`).join('; ');
  }

  async function request(method, path, body, token) {
    const headers = { Accept: 'application/json' };
    const cookies = cookieHeader();

    if (cookies) headers.Cookie = cookies;
    if (token) headers.Authorization = `Bearer ${token}`;

    if (!['GET', 'HEAD'].includes(method)) {
      headers['Content-Type'] = 'application/json';
      headers['x-csrf-token'] = csrfToken;
    }

    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });

    storeCookies(res);

    const raw = await res.text();
    let data = {};
    try {
      data = raw ? JSON.parse(raw) : {};
    } catch {
      data = { raw };
    }

    if (!res.ok) {
      throw new Error(`${method} ${path} failed ${res.status}: ${JSON.stringify(data).slice(0, 300)}`);
    }

    return data;
  }

  return {
    async csrf() {
      const data = await request('GET', '/api/auth/csrf-token');
      csrfToken = data.csrfToken;
      return csrfToken;
    },
    request
  };
}

async function login(email, password) {
  const client = createClient();
  await client.csrf();
  const data = await client.request('POST', '/api/auth/login', { email, password });
  return { client, token: data.token, user: data.user };
}

async function cleanup({ contactId, userId }) {
  if (contactId) {
    await db.query('DELETE FROM notifications WHERE link_url LIKE :link', { link: `%message=${contactId}%` }).catch(() => null);
    await db.query('DELETE FROM admin_audit_logs WHERE entity_type=:type AND entity_id=:id', { type: 'contact_message', id: contactId }).catch(() => null);
    await db.query('DELETE FROM audit_logs WHERE target_type=:type AND target_id=:id', { type: 'contact_message', id: String(contactId) }).catch(() => null);
    await db.query('DELETE FROM contact_messages WHERE id=:id', { id: contactId }).catch(() => null);
  }

  if (userId) {
    await db.query('DELETE FROM notifications WHERE user_id=:id', { id: userId }).catch(() => null);
    await db.query('DELETE FROM refresh_tokens WHERE user_id=:id', { id: userId }).catch(() => null);
    await db.query('DELETE FROM password_reset_tokens WHERE user_id=:id', { id: userId }).catch(() => null);
    await db.query('DELETE FROM users WHERE id=:id', { id: userId }).catch(() => null);
  }
}

async function main() {
  if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD are required for this verification flow');
  }

  const stamp = Date.now();
  const testEmail = `obaydoghassan+rareoud${stamp}@gmail.com`;
  const testPassword = 'RareOud@Test1445!';
  const state = { contactId: null, userId: null };

  try {
    const userClient = createClient();
    await userClient.csrf();

    const registered = await userClient.request('POST', '/api/auth/register', {
      name: 'Rare Oud Test User',
      email: testEmail,
      phone_country_code: 'SY',
      phone: '981653408',
      password: testPassword
    });

    state.userId = registered.user.id;
    const userToken = registered.token;

    const contact = await userClient.request('POST', '/api/contact-messages', {
      name: 'Rare Oud Test User',
      email: testEmail,
      phone: '+963981653408',
      subject: 'SMTP notification verification',
      message: 'هذه رسالة اختبار تلقائي للتحقق من البريد والإشعارات قبل الإطلاق.'
    }, userToken);

    state.contactId = contact.id;

    if (!contact.email_copy_sent) {
      throw new Error(`Contact email copy was not confirmed as sent: ${JSON.stringify(contact)}`);
    }

    const admin = await login(process.env.ADMIN_EMAIL, process.env.ADMIN_PASSWORD);
    const adminList = await admin.client.request('GET', '/api/contact-messages/admin?limit=5', null, admin.token);

    if (!adminList.messages.some(message => Number(message.id) === Number(state.contactId))) {
      throw new Error('Admin contact list did not include the created message');
    }

    const reply = await admin.client.request('PATCH', `/api/contact-messages/${state.contactId}`, {
      status: 'replied',
      admin_reply: 'تم استلام رسالتك بنجاح. هذا رد اختبار للتأكد من الإشعارات والبريد.'
    }, admin.token);

    if (!reply.notification_created) {
      throw new Error(`Reply notification was not created: ${JSON.stringify(reply)}`);
    }

    if (!reply.email_reply_sent) {
      throw new Error(`Reply email was not confirmed as sent: ${JSON.stringify(reply)}`);
    }

    const notifications = await userClient.request('GET', '/api/notifications', null, userToken);
    const notificationFound = notifications.notifications.some(notification => (
      notification.type === 'contact_reply' &&
      String(notification.link_url || '').includes(String(state.contactId))
    ));

    if (!notificationFound) {
      throw new Error('User notification list does not contain the contact reply notification');
    }

    const mine = await userClient.request('GET', '/api/contact-messages/mine?limit=5', null, userToken);
    const ownMessage = mine.messages.find(message => Number(message.id) === Number(state.contactId));

    if (!ownMessage?.admin_reply) {
      throw new Error('User contact replies endpoint did not expose the admin reply');
    }

    console.log(JSON.stringify({
      ok: true,
      contactId: state.contactId,
      emailCopySent: contact.email_copy_sent,
      adminNotificationsCreated: contact.admin_notifications_created,
      replyEmailSent: reply.email_reply_sent,
      replyNotificationCreated: reply.notification_created,
      userNotificationFound: notificationFound,
      userReplyVisible: true
    }));
  } finally {
    await cleanup(state);
    await db.pool.end().catch(() => null);
  }
}

main().catch(error => {
  console.error(JSON.stringify({ ok: false, error: error.message }));
  process.exit(1);
});
