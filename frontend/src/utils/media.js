const backendBase = (import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL || 'http://localhost:5000/api')
  .replace(/\/api\/?$/, '')
  .replace(/\/$/, '');

export function mediaUrl(value, fallback = '/logo.svg') {
  if (!value) return fallback;
  const src = String(value).trim();
  if (!src) return fallback;
  if (/^(https?:|data:|blob:)/i.test(src)) return src;
  return `${backendBase}${src.startsWith('/') ? src : `/${src}`}`;
}

export { backendBase };
