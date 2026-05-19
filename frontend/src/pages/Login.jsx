import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import SEO from '../components/seo/SEO.jsx';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const { login } = useAuth();
  const { lang } = useLanguage();
  const nav = useNavigate();
  const location = useLocation();
  const isArabic = lang === 'ar';

  async function submit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      const result = await login(email, password);
      const role = result?.user?.role;
      const requested = location.state?.from || '/';
      const nextPath = requested.startsWith('/admin') && role !== 'admin' && role !== 'super_admin'
        ? '/'
        : requested;

      nav(nextPath, { replace: true });
    } catch (err) {
      setError(
        err.response?.data?.message ||
        (isArabic ? 'تعذر تسجيل الدخول. تحقق من البريد وكلمة المرور.' : 'Login failed. Check email and password.')
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="section">
      <SEO title={isArabic ? 'تسجيل الدخول' : 'Login'} />
      <form className="container card auth-card" onSubmit={submit}>
        <span className="eyebrow">Rare Oud</span>
        <h1 className="title">{isArabic ? 'تسجيل الدخول' : 'Login'}</h1>
        <p className="muted">
          {isArabic
            ? 'ادخل إلى حسابك لإدارة الطلبات والمفضلة. لوحة الإدارة تظهر للأدمن فقط.'
            : 'Access your account. The admin dashboard is only available to admin users.'}
        </p>

        {error && <p className="error-box">{error}</p>}

        <label>
          {isArabic ? 'البريد الإلكتروني' : 'Email'}
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
        </label>

        <label>
          {isArabic ? 'كلمة المرور' : 'Password'}
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
        </label>

        <button className="btn" disabled={saving}>
          {saving ? (isArabic ? 'جاري الدخول...' : 'Signing in...') : (isArabic ? 'دخول' : 'Login')}
        </button>

        <p className="auth-links">
          <Link to="/register">{isArabic ? 'حساب جديد' : 'Create account'}</Link>
          <span aria-hidden="true">·</span>
          <Link to="/forgot-password">{isArabic ? 'نسيت كلمة المرور؟' : 'Forgot password?'}</Link>
        </p>
      </form>
    </section>
  );
}
