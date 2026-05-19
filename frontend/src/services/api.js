import axios from 'axios';
import { getAccessToken, setAccessToken, clearAccessToken, notifyUnauthorized } from './tokenStore.js';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  withCredentials: true,
  timeout: 15000
});

// CSRF uses a double-submit cookie. The token is read from the cookie at request time
// and is not persisted in localStorage/sessionStorage. Keep CSP strict to reduce XSS risk.
function readCookie(name) {
  if (typeof document === 'undefined') return '';
  return document.cookie.split('; ').find(row => row.startsWith(`${name}=`))?.split('=')[1] || '';
}
let csrfToken = readCookie('rare_oud_csrf') || '';
let refreshPromise = null;

export async function ensureCsrfToken() {
  if (csrfToken) return csrfToken;
  const { data } = await api.get('/auth/csrf-token', { skipAuthRefresh: true });
  csrfToken = data.csrfToken || readCookie('rare_oud_csrf');
  return csrfToken;
}

export function clearCsrfToken() {
  csrfToken = '';
}

api.interceptors.request.use(async (config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;

  const method = (config.method || 'get').toLowerCase();
  if (!['get', 'head', 'options'].includes(method)) {
    config.headers['X-CSRF-Token'] = await ensureCsrfToken();
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config || {};
    if (error.response?.status === 401 && !original._retry && !original.skipAuthRefresh) {
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
    }
    return Promise.reject(error);
  }
);

export default api;
