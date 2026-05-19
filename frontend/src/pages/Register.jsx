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
  const { register } = useAuth();
  const { lang, tr } = useLanguage();
  const nav = useNavigate();

  function setField(name, value) {
    setForm(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: '' }));
  }

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
    await register({
      name: cleanText(form.name, 120),
      email: cleanText(form.email, 254),
      phone: cleanText(form.phone, 40),
      phone_country_code: form.phone_country_code,
      password: form.password
    });
    nav('/');
  }

  return <section className="section"><SEO title={tr('register')} /><form className="container card" style={{ padding: '1.2rem', maxWidth: 560 }} onSubmit={submit} noValidate>
    <h1 className="title">{tr('register')}</h1>
    <label>{tr('fullName')}<input value={form.name || ''} autoComplete="name" onChange={e => setField('name', e.target.value)} />{errors.name && <p className="error-box">{errors.name}</p>}</label>
    <label>{tr('email')}<input type="email" value={form.email || ''} autoComplete="email" onChange={e => setField('email', e.target.value)} />{errors.email && <p className="error-box">{errors.email}</p>}</label>
    <PhoneField lang={lang} label={tr('phone')} countryCode={form.phone_country_code} phone={form.phone || ''} onCountryChange={value => setField('phone_country_code', value)} onPhoneChange={value => setField('phone', value)} error={errors.phone} />
    <label>{message(lang, 'كلمة المرور', 'Password')}<input type="password" value={form.password || ''} autoComplete="new-password" onChange={e => setField('password', e.target.value)} />{errors.password && <p className="error-box">{errors.password}</p>}</label>
    <button className="btn">{tr('register')}</button>
  </form></section>;
}
