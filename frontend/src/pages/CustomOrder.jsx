import { useState } from 'react';
import api from '../services/api.js';
import { useLanguage } from '../context/LanguageContext.jsx';
import PhoneField from '../components/forms/PhoneField.jsx';
import SEO from '../components/seo/SEO.jsx';
import {
  cleanText,
  isEmail,
  message,
  validatePhone
} from '../utils/formValidation.js';

export default function CustomOrder() {
  const { lang, tr } = useLanguage();

  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: '',
    phone_country_code: 'SY',
    phone: '',
    email: '',
    budget: '',
    request_details: ''
  });

  function setField(name, value) {
    setForm(prev => ({
      ...prev,
      [name]: value
    }));

    setErrors(prev => ({
      ...prev,
      [name]: ''
    }));

    setError('');
  }

  function validate() {
    const next = {};

    const name = cleanText(form.name, 140);
    const phone = cleanText(form.phone, 40);
    const email = cleanText(form.email, 254);
    const details = cleanText(form.request_details, 5000);

    if (name.length < 2) {
      next.name = message(
        lang,
        'الاسم مطلوب ويجب أن يكون حرفين على الأقل',
        'Name is required, minimum 2 characters'
      );
    }

    if (!validatePhone(phone, form.phone_country_code)) {
      next.phone = message(
        lang,
        'رقم الهاتف غير صحيح بالنسبة لرمز الدولة المختار',
        'Phone number is invalid for the selected country code'
      );
    }

    if (email && !isEmail(email)) {
      next.email = message(
        lang,
        'البريد الإلكتروني غير صحيح',
        'Invalid email address'
      );
    }

    if (form.budget && Number(form.budget) < 0) {
      next.budget = message(
        lang,
        'الميزانية يجب أن تكون رقمًا موجبًا',
        'Budget must be a positive number'
      );
    }

    if (details.length < 10) {
      next.request_details = message(
        lang,
        'اكتب تفاصيل الطلب بوضوح، 10 أحرف على الأقل',
        'Please describe the request, minimum 10 characters'
      );
    }

    setErrors(next);

    return Object.keys(next).length === 0;
  }

  function extractApiErrors(err) {
    const apiErrors = err.response?.data?.errors;

    if (!Array.isArray(apiErrors)) return {};

    return apiErrors.reduce((acc, item) => {
      if (item.field) {
        acc[item.field] = item.message;
      }

      return acc;
    }, {});
  }

  async function submit(e) {
    e.preventDefault();

    setError('');
    setDone(false);

    if (!validate()) return;

    setSubmitting(true);

    try {
      await api.post('/custom-orders', {
        name: cleanText(form.name, 140),
        phone: cleanText(form.phone, 40),
        phone_country_code: form.phone_country_code || 'SY',
        email: cleanText(form.email, 254),
        budget: form.budget ? Number(form.budget) : '',
        request_details: cleanText(form.request_details, 5000)
      });

      setDone(true);

      setForm({
        name: '',
        phone_country_code: 'SY',
        phone: '',
        email: '',
        budget: '',
        request_details: ''
      });
    } catch (err) {
      const fieldErrors = extractApiErrors(err);

      if (Object.keys(fieldErrors).length > 0) {
        setErrors(prev => ({
          ...prev,
          ...fieldErrors
        }));
      }

      setError(
        err.response?.data?.message ||
          message(lang, 'تعذر إرسال الطلب', 'Unable to submit request')
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="section">
      <SEO title={tr('customOrder')} />
      <form className="container card request-form" onSubmit={submit} noValidate>
        <h1 className="title">{tr('customOrder')}</h1>

        {done && (
          <p className="success-box">
            {message(lang, 'تم إرسال الطلب.', 'Request sent successfully.')}
          </p>
        )}

        {error && <p className="error-box">{error}</p>}

        <label>
          {tr('fullName')}
          <input
            value={form.name}
            onChange={e => setField('name', e.target.value)}
            autoComplete="name"
          />
          {errors.name && <p className="error-box">{errors.name}</p>}
        </label>

        <PhoneField
          lang={lang}
          label={tr('phone')}
          countryCode={form.phone_country_code}
          phone={form.phone}
          onCountryChange={value => setField('phone_country_code', value)}
          onPhoneChange={value => setField('phone', value)}
          error={errors.phone}
          required
        />

        <label>
          {tr('email')}
          <input
            type="email"
            value={form.email}
            onChange={e => setField('email', e.target.value)}
            autoComplete="email"
          />
          {errors.email && <p className="error-box">{errors.email}</p>}
        </label>

        <label>
          {message(lang, 'الميزانية التقريبية', 'Approximate budget')}
          <input
            type="number"
            min="0"
            value={form.budget}
            onChange={e => setField('budget', e.target.value)}
          />
          {errors.budget && <p className="error-box">{errors.budget}</p>}
        </label>

        <label>
          {message(lang, 'المواصفات', 'Specifications')}
          <textarea
            rows="6"
            value={form.request_details}
            onChange={e => setField('request_details', e.target.value)}
          />
          {errors.request_details && (
            <p className="error-box">{errors.request_details}</p>
          )}
        </label>

        <button className="btn" disabled={submitting}>
          {submitting
            ? message(lang, 'جارٍ الإرسال...', 'Submitting...')
            : message(lang, 'إرسال', 'Submit')}
        </button>
      </form>
    </section>
  );
}
