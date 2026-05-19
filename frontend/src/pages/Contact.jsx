import { useEffect, useMemo, useState } from 'react';
import { Mail, MessageSquare, Phone, Send, ShieldCheck } from 'lucide-react';
import api from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import SEO from '../components/seo/SEO.jsx';

const fallback = {
  title: { ar: 'تواصل معنا', en: 'Contact Rare Oud' },
  body: {
    ar: 'اكتب رسالتك وسيتم إرسالها مباشرة إلى لوحة الإدارة. إذا كنت مسجل الدخول، سنرسل نسخة كاملة إلى بريد حسابك بعد تأكيد الإرسال من الخادم.',
    en: 'Send your message directly to the admin dashboard. If you are signed in, a full copy is emailed to your account after the server confirms delivery.'
  }
};

function text(lang, ar, en) {
  return lang === 'ar' ? ar : en;
}

function emailStatusMessage(lang, user, data) {
  const sent = Boolean(data?.email_copy_sent);
  const queued = Boolean(data?.email_copy_queued);
  const configured = Boolean(data?.email_delivery_configured);

  if (!user?.email) {
    return text(lang, 'تم إرسال الرسالة إلى لوحة الإدارة.', 'Message sent to the admin dashboard.');
  }

  if (sent) {
    return text(
      lang,
      'تم إرسال الرسالة إلى لوحة الإدارة، وتم إرسال نسخة كاملة إلى بريد حسابك.',
      'Message sent to the admin dashboard, and a full copy was sent to your account email.'
    );
  }

  if (queued) {
    return text(
      lang,
      'تم إرسال الرسالة إلى لوحة الإدارة. نسخة البريد في قائمة الإرسال وستصل بعد تشغيل عامل البريد.',
      'Message sent to the admin dashboard. The email copy is queued and will be delivered when the email worker runs.'
    );
  }

  if (!configured) {
    return text(
      lang,
      'تم إرسال الرسالة إلى لوحة الإدارة. لم يتم إرسال نسخة بريدية لأن SMTP غير مفعّل.',
      'Message sent to the admin dashboard. No email copy was sent because SMTP is not configured.'
    );
  }

  return text(
    lang,
    'تم إرسال الرسالة إلى لوحة الإدارة، لكن تعذر تأكيد إرسال النسخة البريدية الآن.',
    'Message sent to the admin dashboard, but the email copy could not be confirmed right now.'
  );
}

export default function Contact() {
  const { lang } = useLanguage();
  const { user } = useAuth();

  const [settings, setSettings] = useState({});
  const [page, setPage] = useState(null);
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    subject: '',
    message: ''
  });
  const [state, setState] = useState({ loading: false, error: '', success: '' });

  useEffect(() => {
    let active = true;
    Promise.all([
      api.get('/content/settings').catch(() => ({ data: { settings: [] } })),
      api.get('/content/pages/contact').catch(() => ({ data: { page: null } }))
    ]).then(([settingsResult, pageResult]) => {
      if (!active) return;
      const settingRows = Array.isArray(settingsResult.data?.settings) ? settingsResult.data.settings : [];
      setSettings(settingRows.reduce((acc, row) => {
        let json = row.value_json;
        if (typeof json === 'string') {
          try {
            json = JSON.parse(json);
          } catch {
            json = null;
          }
        }
        acc[row.setting_key] = json?.url || row.value_ar || row.value_en || '';
        return acc;
      }, {}));
      setPage(pageResult.data?.page || null);
    });

    return () => { active = false; };
  }, []);

  useEffect(() => {
    setForm(current => ({
      ...current,
      name: current.name || user?.name || '',
      email: user?.email || current.email || '',
      phone: current.phone || user?.phone || ''
    }));
  }, [user?.email, user?.name, user?.phone]);

  const content = useMemo(() => {
    const title = page?.[`title_${lang}`] || fallback.title[lang];
    const body = page?.[`content_${lang}`] || page?.[`body_${lang}`] || page?.[`meta_description_${lang}`] || fallback.body[lang];
    return { title, body };
  }, [lang, page]);

  function setField(field, value) {
    setForm(current => ({ ...current, [field]: value }));
  }

  function validate() {
    if (form.name.trim().length < 2) {
      return text(lang, 'اكتب الاسم بشكل صحيح.', 'Enter a valid name.');
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      return text(lang, 'البريد الإلكتروني غير صحيح.', 'Invalid email address.');
    }
    if (form.message.trim().length < 10) {
      return text(lang, 'اكتب رسالة من 10 أحرف على الأقل.', 'Enter a message with at least 10 characters.');
    }
    return '';
  }

  async function submit(e) {
    e.preventDefault();
    const error = validate();
    if (error) {
      setState({ loading: false, error, success: '' });
      return;
    }

    setState({ loading: true, error: '', success: '' });
    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        subject: form.subject.trim(),
        message: form.message.trim()
      };
      const { data } = await api.post('/contact-messages', payload);
      setForm(current => ({
        name: user?.name || current.name,
        email: user?.email || current.email,
        phone: user?.phone || current.phone,
        subject: '',
        message: ''
      }));
      setState({
        loading: false,
        error: '',
        success: emailStatusMessage(lang, user, data)
      });
    } catch (err) {
      setState({
        loading: false,
        error: err.response?.data?.message || text(lang, 'تعذر إرسال الرسالة الآن.', 'Unable to send the message now.'),
        success: ''
      });
    }
  }

  const contactEmail = settings.contact_email || '';
  const contactPhone = settings.contact_phone || settings.whatsapp_phone || '';

  return (
    <section className="section contact-page">
      <SEO title={content.title} description={content.body.slice(0, 150)} />
      <div className="container">
        <div className="contact-layout">
          <div className="contact-intro card">
            <span className="eyebrow">Rare Oud</span>
            <h1 className="section-title">{content.title}</h1>
            <p className="muted">{content.body}</p>
            <div className="contact-info-grid">
              <article>
                <Mail size={20} />
                <strong>{text(lang, 'البريد', 'Email')}</strong>
                <span>{contactEmail || text(lang, 'يتم ضبطه من لوحة الإدارة', 'Managed from admin settings')}</span>
              </article>
              <article>
                <Phone size={20} />
                <strong>{text(lang, 'الهاتف', 'Phone')}</strong>
                <span>{contactPhone || text(lang, 'يتم ضبطه من لوحة الإدارة', 'Managed from admin settings')}</span>
              </article>
              <article>
                <ShieldCheck size={20} />
                <strong>{text(lang, 'النسخة البريدية', 'Email copy')}</strong>
                <span>
                  {user?.email
                    ? text(lang, `ستُرسل النسخة إلى: ${user.email}`, `Copy will be sent to: ${user.email}`)
                    : text(lang, 'سجّل الدخول لاستلام نسخة بريدية كاملة', 'Sign in to receive a full email copy')}
                </span>
              </article>
            </div>
          </div>

          <form className="contact-form card" onSubmit={submit}>
            <div className="contact-form-heading">
              <MessageSquare size={22} />
              <div>
                <h2>{text(lang, 'إرسال رسالة', 'Send a message')}</h2>
                <p className="muted">{text(lang, 'ستظهر الرسالة فورًا داخل لوحة الإدارة.', 'The message appears immediately in the admin dashboard.')}</p>
              </div>
            </div>

            {state.error && <p className="error-box">{state.error}</p>}
            {state.success && <p className="success-box">{state.success}</p>}

            <div className="form-grid">
              <label>
                {text(lang, 'الاسم', 'Name')}
                <input
                  value={form.name}
                  onChange={e => setField('name', e.target.value)}
                  autoComplete="name"
                  dir="auto"
                  required
                />
              </label>
              <label>
                {text(lang, 'البريد الإلكتروني', 'Email')}
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setField('email', e.target.value)}
                  autoComplete="email"
                  dir="ltr"
                  readOnly={Boolean(user?.email)}
                />
              </label>
              <label>
                {text(lang, 'الهاتف', 'Phone')}
                <input
                  value={form.phone}
                  onChange={e => setField('phone', e.target.value)}
                  autoComplete="tel"
                  dir="ltr"
                />
              </label>
              <label>
                {text(lang, 'الموضوع', 'Subject')}
                <input
                  value={form.subject}
                  onChange={e => setField('subject', e.target.value)}
                  maxLength={180}
                  dir="auto"
                />
              </label>
            </div>

            <label>
              {text(lang, 'الرسالة', 'Message')}
              <textarea
                value={form.message}
                onChange={e => setField('message', e.target.value)}
                rows="7"
                maxLength={5000}
                dir="auto"
                required
              />
            </label>

            <button className="btn" type="submit" disabled={state.loading}>
              <Send size={18} />
              {state.loading ? text(lang, 'جاري الإرسال...', 'Sending...') : text(lang, 'إرسال الرسالة', 'Send message')}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
