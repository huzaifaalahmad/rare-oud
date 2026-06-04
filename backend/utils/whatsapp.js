const logger = require('./logger');

function normalizePhone(value) {
  return String(value || '').replace(/\D/g, '');
}

function enabled() {
  return process.env.WHATSAPP_ENABLED === 'true';
}

function config() {
  return {
    apiVersion: process.env.WHATSAPP_API_VERSION || 'v19.0',
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN || '',
    adminTo: normalizePhone(process.env.ADMIN_WHATSAPP_TO || process.env.WHATSAPP_ADMIN_TO || process.env.WHATSAPP_PHONE),
    timeoutMs: Number(process.env.WHATSAPP_TIMEOUT_MS || 10000)
  };
}

function money(value) {
  const amount = Number(value || 0);
  return Number.isFinite(amount) ? `$${amount.toFixed(2)}` : String(value || '-');
}

function compact(lines) {
  return lines.filter(Boolean).join('\n').trim();
}

function formatDirectOrderWhatsAppMessage(order = {}) {
  const product = order.product || {};
  return compact([
    'Rare Oud - New product request',
    `Order: ${order.order_number || order.id || '-'}`,
    `Customer: ${order.customer_name || '-'}`,
    `Phone: ${order.customer_phone || '-'}`,
    order.customer_email ? `Email: ${order.customer_email}` : null,
    order.country ? `Country: ${order.country}` : null,
    order.shipping_address ? `Delivery address: ${order.shipping_address}` : null,
    '',
    `Product AR: ${product.name_ar || order.product_name_ar || '-'}`,
    `Product EN: ${product.name_en || order.product_name_en || '-'}`,
    product.sku ? `SKU: ${product.sku}` : null,
    product.slug ? `Slug: ${product.slug}` : null,
    product.condition_status ? `Condition: ${product.condition_status}` : null,
    product.dimensions ? `Dimensions: ${product.dimensions}` : null,
    product.woods_ar ? `Wood AR: ${product.woods_ar}` : null,
    product.origin_country_ar ? `Origin AR: ${product.origin_country_ar}` : null,
    product.maker_identity_ar ? `Maker AR: ${product.maker_identity_ar}` : null,
    '',
    `Quantity: ${order.quantity || 1}`,
    `Unit price: ${money(product.price || order.unit_price)}`,
    `Total: ${money(order.total || order.subtotal)}`,
    order.notes ? `Notes: ${order.notes}` : null,
    '',
    'Dashboard: /admin?tab=orders'
  ]);
}

function formatCustomOrderWhatsAppMessage(order = {}) {
  return compact([
    'Rare Oud - New custom order',
    `Request ID: ${order.id || '-'}`,
    `Customer: ${order.name || '-'}`,
    `Phone: ${order.phone || '-'}`,
    order.email ? `Email: ${order.email}` : null,
    order.budget ? `Budget: ${order.budget}` : null,
    '',
    `Details: ${order.request_details || '-'}`,
    '',
    'Dashboard: /admin?tab=custom_orders'
  ]);
}

async function sendWhatsAppMessage({ to, body }) {
  if (!enabled()) return { sent: false, reason: 'disabled' };
  const cfg = config();
  const recipient = normalizePhone(to || cfg.adminTo);
  if (!cfg.phoneNumberId || !cfg.accessToken || !recipient) {
    logger.warn('WhatsApp notification is enabled but not configured', {
      hasPhoneNumberId: Boolean(cfg.phoneNumberId),
      hasAccessToken: Boolean(cfg.accessToken),
      hasRecipient: Boolean(recipient)
    });
    return { sent: false, reason: 'not_configured' };
  }
  if (typeof fetch !== 'function') throw new Error('WhatsApp sender requires Node 18+ global fetch support');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), cfg.timeoutMs);
  try {
    const response = await fetch(`https://graph.facebook.com/${cfg.apiVersion}/${cfg.phoneNumberId}/messages`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${cfg.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: recipient,
        type: 'text',
        text: { preview_url: false, body }
      })
    });

    const responseText = await response.text();
    if (!response.ok) {
      throw new Error(`WhatsApp send failed ${response.status}: ${responseText.slice(0, 500)}`);
    }
    return { sent: true, status: response.status, response: responseText };
  } finally {
    clearTimeout(timeout);
  }
}

async function sendAdminWhatsAppMessage(body, metadata = {}) {
  try {
    return await sendWhatsAppMessage({ body });
  } catch (error) {
    logger.error('WhatsApp admin notification failed', { error: error.message, ...metadata });
    return { sent: false, reason: 'failed', error: error.message };
  }
}

module.exports = {
  enabled,
  formatDirectOrderWhatsAppMessage,
  formatCustomOrderWhatsAppMessage,
  sendAdminWhatsAppMessage,
  sendWhatsAppMessage
};
