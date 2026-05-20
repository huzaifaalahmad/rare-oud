import axios from 'axios';
import { getAccessToken, setAccessToken, clearAccessToken, notifyUnauthorized } from './tokenStore.js';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  withCredentials: true,
  timeout: 30000
});

// CSRF uses a double-submit cookie. The token is read from the cookie at request time
// and is not persisted in localStorage/sessionStorage. Keep CSP strict to reduce XSS risk.
function readCookie(name) {
  if (typeof document === 'undefined') return '';
  return document.cookie.split('; ').find(row => row.startsWith(`${name}=`))?.split('=')[1] || '';
}
let csrfToken = readCookie('rare_oud_csrf') || '';
let refreshPromise = null;

function isUnsafeMethod(config = {}) {
  const method = (config.method || 'get').toLowerCase();
  return !['get', 'head', 'options'].includes(method);
}

function shouldAttemptRefresh(config = {}) {
  if (config.skipAuthRefresh || config._retry) return false;

  const url = String(config.url || '');
  if (
    url.includes('/auth/login') ||
    url.includes('/auth/register') ||
    url.includes('/auth/refresh') ||
    url.includes('/auth/csrf-token') ||
    url.includes('/auth/forgot-password') ||
    url.includes('/auth/reset-password')
  ) {
    return false;
  }

  return true;
}

export async function ensureCsrfToken({ force = false } = {}) {
  if (force) csrfToken = '';
  if (csrfToken) return csrfToken;
  const { data } = await api.get('/auth/csrf-token', { skipAuthRefresh: true, skipCsrfRetry: true });
  csrfToken = data.csrfToken || readCookie('rare_oud_csrf');
  return csrfToken;
}

export function clearCsrfToken() {
  csrfToken = '';
}

api.interceptors.request.use(async (config) => {
  config.headers ||= {};
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;

  if (isUnsafeMethod(config)) {
    config.headers['X-CSRF-Token'] = await ensureCsrfToken();
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config || {};
    if (error.response?.status === 401 && shouldAttemptRefresh(original)) {
      original._retry = true;
      try {
        refreshPromise ||= api.post('/auth/refresh', {}, { skipAuthRefresh: true }).finally(() => { refreshPromise = null; });
        const { data } = await refreshPromise;
        if (data?.token) setAccessToken(data.token);
        return api(original);
      } catch (refreshError) {
        clearAccessToken();
        notifyUnauthorized();
        return Promise.reject(refreshError);
      }
    }
    if (error.response?.status === 403 && error.response?.data?.code === 'CSRF_INVALID') {
      clearCsrfToken();
      if (!original.skipCsrfRetry && !original._csrfRetry && isUnsafeMethod(original)) {
        original._csrfRetry = true;
        original.headers ||= {};
        original.headers['X-CSRF-Token'] = await ensureCsrfToken({ force: true });
        return api(original);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
