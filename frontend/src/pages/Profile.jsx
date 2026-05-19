import { useEffect, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { Bell, Heart, KeyRound, LogOut, MessageSquare, PackageCheck, Settings, ShieldCheck, UserRound } from 'lucide-react';
import api from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import SEO from '../components/seo/SEO.jsx';

function t(isArabic, ar, en) {
  return isArabic ? ar : en;
}

function strongPassword(value) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{10,128}$/.test(value || '');
}

export default function Profile() {
  const { user, logout, isAdmin, loading } = useAuth();
  const { lang } = useLanguage();
  const [searchParams] = useSearchParams();
  const isArabic = lang === 'ar';
  const [passwordForm, setPasswordForm] = useState({ current_password: '', password: '', confirm: '' });
  const [passwordState, setPasswordState] = useState({ loading: false, error: '', success: '' });
  const [contactState, setContactState] = useState({ loading: false, error: '', messages: [] });
  const highlightedMessageId = searchParams.get('message');

  useEffect(() => {
    if (!user) return undefined;

    let active = true;
    setContactState(current => ({ ...current, loading: true, error: '' }));
    api.get('/contact-messages/mine', { params: { limit: 8 } })
      .then(({ data }) => {
        if (!active) return;
        setContactState({ loading: false, error: '', messages: data.messages || [] });
      })
      .catch(() => {
        if (!active) return;
        setContactState({ loading: false, error: t(isArabic, 'تعذر تحميل ردود التواصل.', 'Unable to load contact replies.'), messages: [] });
      });

    return () => {
      active = false;
    };
  }, [user?.id, isArabic]);

  useEffect(() => {
    if (searchParams.get('section') !== 'contact-replies') return;
    window.setTimeout(() => {
      document.getElementById('contact-replies')?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }, 120);
  }, [searchParams, contactState.messages.length]);

  if (loading) {
    return <section className="section container">{t(isArabic, 'جاري تحميل الملف الشخصي...', 'Loading profile...')}</section>;
  }

  if (!user) return <Navigate to="/login" replace state={{ from: '/profile' }} />;

  function setPasswordField(field, value) {
    setPasswordForm(current => ({ ...current, [field]: value }));
    setPasswordState(current => ({ ...current, error: '', success: '' }));
  }

  async function changePassword(e) {
    e.preventDefault();
    setPasswordState({ loading: false, error: '', success: '' });

    if (!passwordForm.current_password) {
      setPasswordState({ loading: false, error: t(isArabic, 'اكتب كلمة المرور الحالية.', 'Enter your current password.'), success: '' });
      return;
    }

    if (!strongPassword(passwordForm.password)) {
      setPasswordState({ loading: false, error: t(isArabic, 'كلمة المرور الجديدة يجب أن تكون 10 أحرف على الأقل وتحتوي حرفاً كبيراً وصغيراً ورقماً ورمزاً.', 'New password must be 10+ characters and include uppercase, lowercase, number, and symbol.'), success: '' });
      return;
    }

    if (passwordForm.password !== passwordForm.confirm) {
      setPasswordState({ loading: false, error: t(isArabic, 'تأكيد كلمة المرور غير مطابق.', 'Password confirmation does not match.'), success: '' });
      return;
    }

    setPasswordState({ loading: true, error: '', success: '' });
    try {
      await api.post('/auth/change-password', {
        current_password: passwordForm.current_password,
        password: passwordForm.password
      });
      setPasswordForm({ current_password: '', password: '', confirm: '' });
      setPasswordState({ loading: false, error: '', success: t(isArabic, 'تم تغيير كلمة المرور. سيتم تسجيل خروجك لتسجيل الدخول من جديد.', 'Password changed. You will be signed out to sign in again.') });
      window.setTimeout(() => { logout(); }, 1200);
    } catch (err) {
      setPasswordState({ loading: false, error: err.response?.data?.message || t(isArabic, 'تعذر تغيير كلمة المرور.', 'Unable to change password.'), success: '' });
    }
  }

  const actions = [
    {
      to: '/my-orders',
      icon: PackageCheck,
      title: t(isArabic, 'طلباتي', 'My Requests'),
      body: t(isArabic, 'متابعة طلبات المنتجات وطلبات التخصيص.', 'Track product and custom requests.')
    },
    {
      to: '/favorites',
      icon: Heart,
      title: t(isArabic, 'المفضلة', 'Favorites'),
      body: t(isArabic, 'المنتجات التي حفظتها للرجوع إليها لاحقاً.', 'Products you saved for later.')
    },
    {
      to: '/notifications',
      icon: Bell,
      title: t(isArabic, 'الإشعارات', 'Notifications'),
      body: t(isArabic, 'تحديثات الطلبات والردود من الإدارة.', 'Order updates and admin replies.')
    }
  ];

  if (isAdmin) {
    actions.push({
      to: '/admin',
      icon: ShieldCheck,
      title: t(isArabic, 'لوحة الإدارة', 'Admin Dashboard'),
      body: t(isArabic, 'إدارة المنتجات والمحتوى والطلبات.', 'Manage products, content, and requests.')
    });
  }

  return (
    <section className="section profile-page">
      <SEO title={t(isArabic, 'ملفي الشخصي', 'Profile')} />
      <div className="container profile-grid">
        <aside className="card profile-card">
          <div className="profile-avatar" aria-hidden="true">
            <UserRound size={34} />
          </div>
          <span className="eyebrow">Rare Oud</span>
          <h1>{user.name || t(isArabic, 'مستخدم', 'User')}</h1>
          <p className="muted">{user.email}</p>
          {user.phone && <p className="muted">{user.phone}</p>}
          <span className="status-pill">{isAdmin ? t(isArabic, 'أدمن', 'Admin') : t(isArabic, 'مستخدم', 'Customer')}</span>

          <button className="btn secondary profile-logout" type="button" onClick={logout}>
            <LogOut size={18} /> {t(isArabic, 'تسجيل الخروج', 'Logout')}
          </button>
        </aside>

        <main className="profile-main">
          <div className="profile-head">
            <span className="eyebrow">{t(isArabic, 'الحساب', 'Account')}</span>
            <h2>{t(isArabic, 'ملفي الشخصي', 'Profile')}</h2>
            <p className="muted">
              {t(isArabic, 'كل أدوات حسابك في مكان واحد بدون ازدحام في شريط التنقل.', 'All account tools in one place without crowding the navigation bar.')}
            </p>
          </div>

          <div className="profile-actions-grid">
            {actions.map(action => {
              const ActionIcon = action.icon;
              return (
                <Link className="card profile-action" to={action.to} key={action.to}>
                  <ActionIcon size={22} />
                  <strong>{action.title}</strong>
                  <span className="muted">{action.body}</span>
                </Link>
              );
            })}
          </div>

          <div className="card profile-contact-replies" id="contact-replies">
            <h3><MessageSquare size={20} /> {t(isArabic, 'رسائل التواصل والردود', 'Contact messages and replies')}</h3>
            <p className="muted">
              {t(isArabic, 'أي رد من الإدارة على رسائلك يظهر هنا مباشرة، ويمكن الوصول إليه من الإشعار.', 'Admin replies to your contact messages appear here and open from notifications.')}
            </p>
            {contactState.error && <p className="error-box">{contactState.error}</p>}
            {contactState.loading && <p className="muted">{t(isArabic, 'جاري تحميل الرسائل...', 'Loading messages...')}</p>}
            {!contactState.loading && !contactState.messages.length && (
              <p className="muted">{t(isArabic, 'لا توجد رسائل تواصل مرتبطة بحسابك بعد.', 'No contact messages are linked to your account yet.')}</p>
            )}
            <div className="profile-contact-list">
              {contactState.messages.map(message => (
                <article
                  className={`profile-contact-thread ${String(message.id) === String(highlightedMessageId) ? 'is-highlighted' : ''}`}
                  key={message.id}
                >
                  <div>
                    <strong>{message.subject || t(isArabic, 'رسالة بدون موضوع', 'Message without subject')}</strong>
                    <span className="status-pill">{message.status}</span>
                  </div>
                  <p>{message.message}</p>
                  {message.admin_reply ? (
                    <div className="admin-reply-box">
                      <small>{t(isArabic, 'رد الإدارة', 'Admin reply')}</small>
                      <p>{message.admin_reply}</p>
                      {message.responded_at && <span>{new Date(message.responded_at).toLocaleString(isArabic ? 'ar' : 'en')}</span>}
                    </div>
                  ) : (
                    <p className="muted">{t(isArabic, 'لم يتم الرد على هذه الرسالة بعد.', 'This message has not been replied to yet.')}</p>
                  )}
                </article>
              ))}
            </div>
          </div>

          <div className="card profile-details">
            <h3><Settings size={20} /> {t(isArabic, 'تفاصيل الحساب', 'Account details')}</h3>
            <dl>
              <div><dt>{t(isArabic, 'الاسم', 'Name')}</dt><dd>{user.name || '-'}</dd></div>
              <div><dt>{t(isArabic, 'البريد الإلكتروني', 'Email')}</dt><dd>{user.email || '-'}</dd></div>
              <div><dt>{t(isArabic, 'الهاتف', 'Phone')}</dt><dd>{user.phone || '-'}</dd></div>
              <div><dt>{t(isArabic, 'الدور', 'Role')}</dt><dd>{user.role || 'user'}</dd></div>
            </dl>
          </div>

          <form className="card profile-password" onSubmit={changePassword}>
            <h3><KeyRound size={20} /> {t(isArabic, 'تغيير كلمة المرور', 'Change password')}</h3>
            <p className="muted">{t(isArabic, 'هذه العملية تتطلب كلمة المرور الحالية وستسجل خروجك بعد النجاح.', 'This requires your current password and signs you out after success.')}</p>
            {passwordState.error && <p className="error-box">{passwordState.error}</p>}
            {passwordState.success && <p className="success-box">{passwordState.success}</p>}
            <div className="form-grid">
              <label>
                {t(isArabic, 'كلمة المرور الحالية', 'Current password')}
                <input type="password" value={passwordForm.current_password} onChange={e => setPasswordField('current_password', e.target.value)} autoComplete="current-password" />
              </label>
              <label>
                {t(isArabic, 'كلمة المرور الجديدة', 'New password')}
                <input type="password" value={passwordForm.password} onChange={e => setPasswordField('password', e.target.value)} autoComplete="new-password" />
              </label>
              <label>
                {t(isArabic, 'تأكيد كلمة المرور الجديدة', 'Confirm new password')}
                <input type="password" value={passwordForm.confirm} onChange={e => setPasswordField('confirm', e.target.value)} autoComplete="new-password" />
              </label>
            </div>
            <button className="btn" disabled={passwordState.loading}>
              {passwordState.loading ? t(isArabic, 'جارٍ التغيير...', 'Changing...') : t(isArabic, 'تغيير كلمة المرور', 'Change password')}
            </button>
          </form>
        </main>
      </div>
    </section>
  );
}
