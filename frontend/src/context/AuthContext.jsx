import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react';

import api, { clearCsrfToken } from '../services/api.js';
import {
  clearAccessToken,
  setAccessToken,
  setUnauthorizedHandler
} from '../services/tokenStore.js';

const AuthContext = createContext(null);
const ACCESS_TOKEN_KEY = 'rare_oud_access_token';
const USER_KEY = 'rare_oud_user';
const SESSION_HINT_KEY = 'rare_oud_has_session';

function clearStoredSession() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(SESSION_HINT_KEY);
  clearAccessToken();
  clearCsrfToken();
}

function persistSession(nextToken, nextUser) {
  if (nextToken) {
    localStorage.setItem(ACCESS_TOKEN_KEY, nextToken);
    localStorage.setItem(SESSION_HINT_KEY, '1');
    setAccessToken(nextToken);
  }

  if (nextUser) {
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => {
    return localStorage.getItem(ACCESS_TOKEN_KEY) || null;
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearStoredSession();
      setUser(null);
      setToken(null);
    });

    return () => setUnauthorizedHandler(null);
  }, []);

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      const existingToken = localStorage.getItem(ACCESS_TOKEN_KEY);
      const hasSessionHint = localStorage.getItem(SESSION_HINT_KEY) === '1';

      if (!existingToken) {
        clearAccessToken();
        if (!hasSessionHint) {
          localStorage.removeItem(USER_KEY);
          if (active) {
            setUser(null);
            setToken(null);
            setLoading(false);
          }
          return;
        }

        try {
          const refreshed = await api.post('/auth/refresh', {}, { skipAuthRefresh: true });
          if (!active) return;

          const nextToken = refreshed.data?.token || refreshed.data?.accessToken;
          const nextUser = refreshed.data?.user || null;

          if (nextToken) {
            persistSession(nextToken, nextUser);
            setToken(nextToken);
          }

          if (nextUser) {
            setUser(nextUser);
          }
        } catch {
          clearStoredSession();
          if (active) {
            setUser(null);
            setToken(null);
          }
        } finally {
          if (active) setLoading(false);
        }
        return;
      }

      setAccessToken(existingToken);

      try {
        const response = await api.get('/auth/me', {
          params: { _ts: Date.now() }
        });

        if (!active) return;

        const nextUser = response.data?.user || null;

        setUser(nextUser);
        persistSession(existingToken, nextUser);
      } catch {
        clearStoredSession();

        if (!active) return;

        setUser(null);
        setToken(null);
      } finally {
        if (active) setLoading(false);
      }
    }

    bootstrap();

    return () => {
      active = false;
    };
  }, []);

  async function login(email, password) {
    setLoading(true);
    try {
      const response = await api.post('/auth/login', {
        email,
        password
      });

      const nextToken =
        response.data?.token ||
        response.data?.accessToken;

      const nextUser = response.data?.user || null;

      if (nextToken) {
        persistSession(nextToken, nextUser);
        setToken(nextToken);
      }

      if (nextUser) {
        setUser(nextUser);
      }

      return response.data;
    } finally {
      setLoading(false);
    }
  }

  async function register(payload) {
    const response = await api.post('/auth/register', payload);

    const nextToken =
      response.data?.token ||
      response.data?.accessToken;

    const nextUser = response.data?.user || null;

    if (nextToken) {
      persistSession(nextToken, nextUser);
      setToken(nextToken);
    }

    if (nextUser) {
      setUser(nextUser);
    }

    return response.data;
  }

  async function logout() {
    try {
      await api.post('/auth/logout');
    } catch {}

    clearStoredSession();

    setUser(null);
    setToken(null);
  }

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      login,
      register,
      logout,
      isAuthenticated: !!user,
      isAdmin: ['admin', 'super_admin'].includes(user?.role)
    }),
    [user, token, loading]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
