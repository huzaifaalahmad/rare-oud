import { useState } from 'react';
import api from '../services/api.js';
import SEO from '../components/seo/SEO.jsx';
import PhoneField from '../components/forms/PhoneField.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';

function t(lang, ar, en) {
  return lang === 'ar' ? ar : en;
}

export default function ForgotPassword() {
  const { lang } = useLanguage();
  const [mode, setMode] = useState('email');
  const [form, setForm] = useState({ email: '', phone_country_code: 'SY', phone: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  function setField(field, value) {
    setForm(current => ({ ...current, [field]: value }));
    setError('');
  }

  async function submit(e) {
    e.preventDefault();
    setMessage('');
    setError('');

    const payload = mode === 'email'
      ? { email: form.email.trim() }
      : { phone_country_code: form.phone_country_code, phone: form.phone.trim() };

    if (mode === 'email' && !payload.email) {
      setError(t(lang, 'اكتب البريد الإلكتروني المرتبط بحسابك.', 'Enter your account email.'));
      return;
    }

    if (mode === 'phone' && !payload.phone) {
      setError(t(lang, 'اكتب رقم الهاتف المرتبط بحسابك.', 'Enter your account phone number.'));
      return;
    }

    try {
      await api.post('/auth/forgot-password', payload);
      setMessage(t(
        lang,
        'إذا كان الحساب موجوداً، سيتم إرسال رابط إعادة الضبط إلى بريد الحساب المسجل. يمكنك البحث بالبريد أو رقم الهاتف.',
        'If the account exists, a reset link will be sent to the registered account email. You can search by email or phone.'
      ));
    } catch (err) {
      setError(err.response?.data?.message || t(lang, 'تعذر إرسال طلب إعادة الضبط', 'Unable to send reset request'));
    }
  }

  return (
    <section className="section auth-page">
      <SEO title={t(lang, 'نسيان كلمة المرور', 'Forgot password')} />
      <form className="container card auth-card" onSubmit={submit}>
        <span className="eyebrow">Rare Oud</span>
        <h1 className="title">{t(lang, 'نسيان كلمة المرور', 'Forgot password')}</h1>
        <p className="muted">
          {t(
            lang,
            'اختر التحقق بالبريد أو رقم الهاتف. إذا وجدنا الحساب، نرسل رابط إعادة الضبط إلى بريد الحساب المسجل.',
            'Choose email or phone verification. If we find the account, we send a reset link to the registered account email.'
          )}
        </p>

        <div className="segmented-control" role="tablist" aria-label={t(lang, 'طريقة التحقق', 'Verification method')}>
          <button type="button" className={mode === 'email' ? 'active' : ''} onClick={() => setMode('email')}>
            {t(lang, 'البريد', 'Email')}
          </button>
          <button type="button" className={mode === 'phone' ? 'active' : ''} onClick={() => setMode('phone')}>
            {t(lang, 'الهاتف', 'Phone')}
          </button>
        </div>

        {message && <p className="success-box">{message}</p>}
        {error && <p className="error-box">{error}</p>}

        {mode === 'email' ? (
          <label>
            {t(lang, 'البريد الإلكتروني', 'Email')}
            <input
              type="email"
              value={form.email}
              onChange={e => setField('email', e.target.value)}
              autoComplete="email"
            />
          </label>
        ) : (
          <PhoneField
            lang={lang}
            label={t(lang, 'رقم الهاتف', 'Phone number')}
            countryCode={form.phone_country_code}
            phone={form.phone}
            onCountryChange={value => setField('phone_country_code', value)}
            onPhoneChange={value => setField('phone', value)}
          />
        )}

        <button className="btn">{t(lang, 'إرسال رابط إعادة الضبط', 'Send reset link')}</button>
      </form>
    </section>
  );
}