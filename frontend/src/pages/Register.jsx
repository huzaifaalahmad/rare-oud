import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import PhoneField from '../components/forms/PhoneField.jsx';
import { cleanText, isEmail, message, validatePassword, validatePhone } from '../utils/formValidation.js';
import SEO from '../components/seo/SEO.jsx';

export default function Register() {
  const [form, setForm] = useState({ phone_country_code: 'SY' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [saving, setSaving] = useState(false);
  const { register } = useAuth();
  const { lang, tr } = useLanguage();
  const nav = useNavigate();

  function setField(name, value) {
    setForm(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: '' }));
    setServerError('');
  }

  const passwordValue = String(form.password || '');
  const passwordRules = [
    { ok: passwordValue.length >= 10, ar: '10 أحرف على الأقل', en: 'At least 10 characters' },
    { ok: /[A-Z]/.test(passwordValue), ar: 'حرف إنكليزي كبير A-Z', en: 'One uppercase English letter A-Z' },
    { ok: /[a-z]/.test(passwordValue), ar: 'حرف إنكليزي صغير a-z', en: 'One lowercase English letter a-z' },
    { ok: /[0-9]/.test(passwordValue), ar: 'رقم لاتيني 0-9', en: 'One Latin digit 0-9' },
    { ok: /[^A-Za-z0-9]/.test(passwordValue), ar: 'رمز مثل @ أو # أو !', en: 'One symbol like @, #, or !' }
  ];

  function validate() {
    const next = {};
    if (cleanText(form.name, 120).length < 2) next.name = message(lang, 'الاسم مطلوب ويجب أن يكون حرفين على الأقل', 'Name is required, minimum 2 characters');
    if (!isEmail(form.email)) next.email = message(lang, 'البريد الإلكتروني غير صحيح', 'Invalid email address');
    if (form.phone && !validatePhone(form.phone, form.phone_country_code)) next.phone = message(lang, 'رقم الهاتف غير صحيح بالنسبة لرمز الدولة المختار', 'Phone number is invalid for the selected country code');
    if (!validatePassword(form.password)) next.password = message(lang, 'كلمة المرور يجب أن تكون 10 أحرف وتتضمن حرفًا كبيرًا وصغيرًا ورقمًا ورمزًا', 'Password must be 10+ chars and include uppercase, lowercase, number, and symbol');
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit(e) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    setServerError('');
    try {
      await register({
        name: cleanText(form.name, 120),
        email: cleanText(form.email, 254),
        phone: cleanText(form.phone, 40),
        phone_country_code: form.phone_country_code,
        password: form.password
      });
      nav('/');
    } catch (err) {
      const details = err.response?.data?.details;
      const passwordDetail = Array.isArray(details) ? details.find(item => item.path === 'password')?.message : '';
      setServerError(passwordDetail || err.response?.data?.message || message(lang, 'تعذر إنشاء الحساب. تحقق من البيانات وحاول مجددًا.', 'Unable to create account. Check your details and try again.'));
    } finally {
      setSaving(false);
    }
  }

  return <section className="section"><SEO title={tr('register')} /><form className="container card" style={{ padding: '1.2rem', maxWidth: 560 }} onSubmit={submit} noValidate>
    <h1 className="title">{tr('register')}</h1>
    {serverError && <p className="error-box">{serverError}</p>}
    <label>{tr('fullName')}<input value={form.name || ''} autoComplete="name" onChange={e => setField('name', e.target.value)} />{errors.name && <p className="error-box">{errors.name}</p>}</label>
    <label>{tr('email')}<input type="email" value={form.email || ''} autoComplete="email" onChange={e => setField('email', e.target.value)} />{errors.email && <p className="error-box">{errors.email}</p>}</label>
    <PhoneField lang={lang} label={tr('phone')} countryCode={form.phone_country_code} phone={form.phone || ''} onCountryChange={value => setField('phone_country_code', value)} onPhoneChange={value => setField('phone', value)} error={errors.phone} />
    <label>{message(lang, 'كلمة المرور', 'Password')}<input type="password" value={form.password || ''} autoComplete="new-password" onChange={e => setField('password', e.target.value)} />{errors.password && <p className="error-box">{errors.password}</p>}</label>
    <ul className="password-rules" aria-live="polite">
      {passwordRules.map(rule => <li key={rule.en} className={rule.ok ? 'ok' : ''}>{rule.ok ? '✓' : '○'} {message(lang, rule.ar, rule.en)}</li>)}
    </ul>
    <button className="btn" disabled={saving}>{saving ? message(lang, 'جارٍ إنشاء الحساب...', 'Creating account...') : tr('register')}</button>
  </form></section>;
}
