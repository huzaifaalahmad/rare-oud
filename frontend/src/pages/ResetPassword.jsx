import { useMemo, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../services/api.js';
import SEO from '../components/seo/SEO.jsx';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = useMemo(() => params.get('token') || '', [params]);
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setMessage(''); setError('');
    if (!token) {
      setError('رابط غير صالح أو منتهي الصلاحية. اطلب رابطًا جديدًا من صفحة نسيان كلمة المرور.');
      return;
    }
    try {
      await api.post('/auth/reset-password', { token, password });
      setMessage('تم تغيير كلمة المرور بنجاح. يمكنك تسجيل الدخول الآن.');
    } catch (err) {
      setError(err.response?.data?.message || 'تعذر تغيير كلمة المرور');
    }
  }

  return <section className="section">
    <SEO title="إعادة ضبط كلمة المرور" />
    <form className="container card" style={{ padding: '1.2rem', maxWidth: 560 }} onSubmit={submit}>
      <h1 className="title">إعادة ضبط كلمة المرور</h1>
      {message && <p className="success-box">{message} <Link to="/login">تسجيل الدخول</Link></p>}
      {error && <p className="error-box">{error}</p>}
      {!token && <p className="error-box">رابط غير صالح أو منتهي الصلاحية. اطلب رابطًا جديدًا من صفحة نسيان كلمة المرور.</p>}
      <label>كلمة المرور الجديدة<input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={10} disabled={!token} /></label>
      <button className="btn" disabled={!token}>تحديث كلمة المرور</button>
    </form>
  </section>;
}
