import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import AdminProducts from '../../components/admin/AdminProducts.jsx';
import AdminCategories from '../../components/admin/AdminCategories.jsx';
import AdminContent from '../../components/admin/AdminContent.jsx';
import AdminOrders from '../../components/admin/AdminOrders.jsx';
import { AdminUsers, AdminReviews } from '../../components/admin/AdminSimpleLists.jsx';
import AdminCustomOrders from '../../components/admin/AdminCustomOrders.jsx';
import AdminContactMessages from '../../components/admin/AdminContactMessages.jsx';
import AdminAnalytics from '../../components/admin/AdminAnalytics.jsx';
import AdminMediaLibrary from '../../components/admin/AdminMediaLibrary.jsx';
import AdminBanners from '../../components/admin/AdminBanners.jsx';
import AdminShipping from '../../components/admin/AdminShipping.jsx';
import AdminSiteReviews from '../../components/admin/AdminSiteReviews.jsx';
import AdminSystemHealth from '../../components/admin/AdminSystemHealth.jsx';
import { useLanguage } from '../../context/LanguageContext.jsx';
import Icon from '../../components/ui/Icon.jsx';

const ADMIN_TABS = [
  ['analytics', { en: 'Analytics', ar: 'التحليلات' }, 'analytics'],
  ['products', { en: 'Products', ar: 'المنتجات' }, 'products'],
  ['categories', { en: 'Categories', ar: 'التصنيفات' }, 'categories'],
  ['orders', { en: 'Orders', ar: 'الطلبات' }, 'orders'],
  ['contact_messages', { en: 'Contact Messages', ar: 'رسائل التواصل' }, 'mail'],
  ['content', { en: 'Content & Settings', ar: 'المحتوى والإعدادات' }, 'content'],
  ['media', { en: 'Media Library', ar: 'مكتبة الوسائط' }, 'gallery'],
  ['banners', { en: 'Banners', ar: 'البنرات' }, 'sparkle'],
  ['shipping', { en: 'Shipping', ar: 'الشحن' }, 'orders'],
  ['users', { en: 'Users', ar: 'المستخدمون' }, 'users'],
  ['reviews', { en: 'Reviews', ar: 'تقييمات المنتجات' }, 'reviews'],
  ['site_reviews', { en: 'Site Reviews', ar: 'تقييمات الموقع' }, 'verified'],
  ['custom_orders', { en: 'Custom Orders', ar: 'طلبات التخصيص' }, 'magic'],
  ['system', { en: 'System Health', ar: 'صحة النظام' }, 'settings']
];

const TAB_KEYS = new Set(ADMIN_TABS.map(([key]) => key));

export default function AdminDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get('tab');
  const [tab, setTab] = useState(() => TAB_KEYS.has(requestedTab) ? requestedTab : 'analytics');
  const { lang } = useLanguage();
  const isArabic = lang === 'ar';

  useEffect(() => {
    const next = TAB_KEYS.has(requestedTab) ? requestedTab : 'analytics';
    if (next !== tab) setTab(next);
  }, [requestedTab, tab]);

  const labelFor = (label) => label[isArabic ? 'ar' : 'en'];

  function chooseTab(key) {
    setTab(key);
    const next = new URLSearchParams(searchParams);
    next.set('tab', key);
    setSearchParams(next, { replace: true });
  }

  const activeLabel = useMemo(() => {
    const activeTab = ADMIN_TABS.find(([key]) => key === tab);
    return activeTab ? labelFor(activeTab[1]) : isArabic ? 'لوحة الإدارة' : 'Dashboard';
  }, [isArabic, tab]);

  return (
    <section
      className="admin-workspace"
      aria-label={isArabic ? 'لوحة إدارة العود النادر' : 'Rare Oud admin dashboard'}
    >
      <aside className="admin-side lux-card">
        <div className="admin-side-head">
          <span className="admin-kicker">Rare Oud</span>
          <h1>{isArabic ? 'لوحة الإدارة' : 'Admin'}</h1>
          <p>
            {isArabic
              ? 'إدارة المنتجات والطلبات والرسائل والمحتوى من مساحة عمل آمنة ومتجاوبة.'
              : 'Manage products, orders, messages, and content from a secure responsive workspace.'}
          </p>
        </div>

        <nav className="admin-tabs" aria-label={isArabic ? 'أقسام لوحة الإدارة' : 'Admin sections'}>
          {ADMIN_TABS.map(([key, label, icon]) => (
            <button
              className={tab === key ? 'active' : ''}
              key={key}
              type="button"
              onClick={() => chooseTab(key)}
            >
              <Icon name={icon} size={18} />
              <span>{labelFor(label)}</span>
            </button>
          ))}
        </nav>
      </aside>

      <main className="admin-main-panel lux-card">
        <header className="admin-page-header">
          <span className="eyebrow">{isArabic ? 'مركز التحكم' : 'Control Room'}</span>
          <h2>{activeLabel}</h2>
        </header>

        <div className="admin-panel-scroll">
          {tab === 'analytics' && <AdminAnalytics />}
          {tab === 'products' && <AdminProducts />}
          {tab === 'categories' && <AdminCategories />}
          {tab === 'orders' && <AdminOrders />}
          {tab === 'contact_messages' && <AdminContactMessages />}
          {tab === 'content' && <AdminContent />}
          {tab === 'media' && <AdminMediaLibrary />}
          {tab === 'banners' && <AdminBanners />}
          {tab === 'shipping' && <AdminShipping />}
          {tab === 'users' && <AdminUsers />}
          {tab === 'reviews' && <AdminReviews />}
          {tab === 'site_reviews' && <AdminSiteReviews />}
          {tab === 'custom_orders' && <AdminCustomOrders />}
          {tab === 'system' && <AdminSystemHealth />}
        </div>
      </main>
    </section>
  );
}