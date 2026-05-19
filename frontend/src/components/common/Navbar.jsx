import { Link, NavLink } from 'react-router-dom';
import { Moon, Sun, UserRound } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTheme } from '../../context/ThemeContext.jsx';
import { useLanguage } from '../../context/LanguageContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import api from '../../services/api.js';
import Icon from '../ui/Icon.jsx';

export default function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const { lang, setLang, tr } = useLanguage();
  const { user, isAdmin, loading } = useAuth();

  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [scrolled, setScrolled] = useState(false);

  const isArabic = lang === 'ar';
  const showUserLinks = !loading && Boolean(user);
  const showAdmin = !loading && isAdmin;

  const refreshUnread = useCallback(() => {
    if (loading || !user) {
      setUnread(0);
      return;
    }

    api.get('/notifications/unread-count')
      .then(({ data }) => {
        setUnread(Number(data.unread || 0));
      })
      .catch(() => {});
  }, [loading, user?.id]);

  useEffect(() => {
    refreshUnread();
  }, [refreshUnread]);

  useEffect(() => {
    window.addEventListener('rare-oud:notifications-updated', refreshUnread);
    return () => {
      window.removeEventListener('rare-oud:notifications-updated', refreshUnread);
    };
  }, [refreshUnread]);

  useEffect(() => {
    const updateScrolled = () => setScrolled(window.scrollY > 10);
    updateScrolled();
    window.addEventListener('scroll', updateScrolled, { passive: true });
    return () => window.removeEventListener('scroll', updateScrolled);
  }, []);

  useEffect(() => {
    let active = true;

    api.get('/content/settings')
      .then(({ data }) => {
        if (!active) return;
        const settingsArray = Array.isArray(data.settings)
          ? data.settings
          : Object.values(data.settings || {});
        const whatsappSetting = settingsArray.find(s => s.setting_key === 'whatsapp_phone') || {};
        const raw = String(whatsappSetting.value_ar || whatsappSetting.value_en || '').replace(/\D/g, '');
        setWhatsappPhone(raw);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  const primaryLinks = [
    ['/', tr('home'), 'home'],
    ['/products', tr('products'), 'products'],
    ['/accessories', tr('accessories'), 'accessories'],
    ['/custom-order', tr('customOrder'), 'magic'],
    ['/contact', tr('contact'), 'contact']
  ];

  const secondaryLinks = [
    ['/category/educational', tr('educational'), 'music'],
    ['/category/intermediate', tr('medium'), 'music'],
    ['/category/rare', tr('rare'), 'sparkle'],
    ['/category/vip', 'VIP', 'verified'],
    ['/about', tr('about'), 'content'],
    ['/links', isArabic ? 'الروابط' : 'Links', 'productSearch']
  ];

  const accountLinks = showUserLinks
    ? [
        ['/profile', isArabic ? 'الملف الشخصي' : 'Profile', 'users'],
        ['/my-orders', isArabic ? 'طلباتي' : 'My Requests', 'orders'],
        ['/favorites', tr('favorites'), 'favorite'],
        ['/notifications', unread > 0 ? `${isArabic ? 'الإشعارات' : 'Notifications'} (${unread})` : (isArabic ? 'الإشعارات' : 'Notifications'), 'bell']
      ]
    : [];

  const navClass = ({ isActive }) => (isActive ? 'nav-link active' : 'nav-link');
  const adminNavClass = ({ isActive }) =>
    isActive ? 'nav-link nav-link-admin active' : 'nav-link nav-link-admin';

  const renderLink = ([to, label, icon]) => (
    <NavLink
      key={to}
      to={to}
      end={to === '/'}
      className={navClass}
      onClick={() => setOpen(false)}
    >
      <Icon name={icon} size={16} />
      <span>{label}</span>
    </NavLink>
  );

  const whatsappText = encodeURIComponent(
    isArabic
      ? 'مرحباً، أريد الاستفسار عن منتجات العود النادر.'
      : 'Hello, I would like to inquire about Rare Oud products.'
  );

  return (
    <header className={`navbar ${scrolled ? 'is-scrolled' : ''}`}>
      <div className="container nav-inner">
        <Link
          className="brand"
          to="/"
          onClick={() => setOpen(false)}
          aria-label={isArabic ? 'الرئيسية' : 'Home'}
        >
          <img src="/logo.svg" alt="" aria-hidden="true" loading="lazy" decoding="async" />
        </Link>

        <nav className="nav-links" aria-label={isArabic ? 'التنقل الرئيسي' : 'Main navigation'}>
          {primaryLinks.map(renderLink)}
        </nav>

        <div className="nav-actions">
          {whatsappPhone && (
            <a
              className="btn nav-whatsapp"
              href={`https://wa.me/${whatsappPhone}?text=${whatsappText}`}
              target="_blank"
              rel="noreferrer"
            >
              <Icon name="whatsapp" size={17} />
              <span>{isArabic ? 'واتساب' : 'WhatsApp'}</span>
            </a>
          )}

          <button
            className="icon-btn"
            type="button"
            aria-label={isArabic ? 'تغيير اللغة إلى الإنجليزية' : 'Switch language to Arabic'}
            onClick={() => setLang(isArabic ? 'en' : 'ar')}
          >
            {isArabic ? 'EN' : 'AR'}
          </button>

          <button
            className="icon-btn"
            type="button"
            aria-label={isArabic ? 'تبديل المظهر' : 'Toggle theme'}
            onClick={toggleTheme}
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>

          {showUserLinks ? (
            <Link
              className="icon-btn profile-nav-link badge-wrap"
              aria-label={isArabic ? 'الملف الشخصي' : 'Profile'}
              to="/profile"
              onClick={() => setOpen(false)}
            >
              <UserRound size={18} />
              {unread > 0 && <span className="badge-dot">{unread}</span>}
            </Link>
          ) : (
            <Link className="btn login-btn" to="/login" onClick={() => setOpen(false)}>
              {tr('login')}
            </Link>
          )}

          <button
            className="icon-btn mobile-menu-btn"
            type="button"
            aria-label={isArabic ? 'فتح المزيد من الروابط' : 'Open more links'}
            aria-expanded={open}
            onClick={() => setOpen(v => !v)}
          >
            {open ? <Icon name="close" size={20} /> : <Icon name="menu" size={20} />}
            <span className="menu-label">{isArabic ? 'المزيد' : 'More'}</span>
          </button>
        </div>
      </div>

      <div className={`container mobile-menu ${open ? 'open' : ''}`}>
        <div className="mobile-menu-section mobile-menu-primary">
          {primaryLinks.map(renderLink)}
        </div>

        <div className="mobile-menu-section">
          {secondaryLinks.map(renderLink)}
        </div>

        {showUserLinks && (
          <div className="mobile-menu-section">
            <span className="mobile-menu-kicker">{isArabic ? 'الحساب' : 'Account'}</span>
            {accountLinks.map(renderLink)}
          </div>
        )}

        {showAdmin && (
          <div className="mobile-menu-section">
            <NavLink to="/admin" className={adminNavClass} onClick={() => setOpen(false)}>
              <Icon name="admin" size={16} />
              <span>{tr('admin')}</span>
            </NavLink>
          </div>
        )}
      </div>
    </header>
  );
}
