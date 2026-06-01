import { Suspense, lazy, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/common/Navbar.jsx';
import Footer from './components/common/Footer.jsx';
import ProtectedAdminRoute from './components/admin/ProtectedAdminRoute.jsx';
import api from './services/api.js';

const Home = lazy(() => import('./pages/Home.jsx'));
const Products = lazy(() => import('./pages/Products.jsx'));
const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage.jsx'));
const Login = lazy(() => import('./pages/Login.jsx'));
const Register = lazy(() => import('./pages/Register.jsx'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword.jsx'));
const ResetPassword = lazy(() => import('./pages/ResetPassword.jsx'));
const Favorites = lazy(() => import('./pages/Favorites.jsx'));
const Profile = lazy(() => import('./pages/Profile.jsx'));
const CustomOrder = lazy(() => import('./pages/CustomOrder.jsx'));
const MyOrders = lazy(() => import('./pages/MyOrders.jsx'));
const Notifications = lazy(() => import('./pages/Notifications.jsx'));
const Contact = lazy(() => import('./pages/Contact.jsx'));
const StaticPage = lazy(() => import('./pages/StaticPage.jsx'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard.jsx'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage.jsx'));

function PageLoader(){return <section className="section"><div className="container card page-loader-card" style={{padding:'1rem'}}>Loading Rare Oud...</div></section>}

function useExperienceMotion() {
  const location = useLocation();

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      document.documentElement.classList.remove('motion-enabled');
      return undefined;
    }

    document.documentElement.classList.add('motion-enabled');

    const selector = [
      '.app-main .section',
      '.app-main .card',
      '.app-main .product-card',
      '.app-main .policy-card',
      '.app-main .profile-action',
      '.app-main .admin-tabs button',
      '.app-main .table tbody tr',
      '.app-main .contact-info-grid article',
      '.app-main .meta-grid p',
      '.footer .footer-panel',
      '.footer .footer-brand'
    ].join(',');

    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('motion-in');
          observer.unobserve(entry.target);
        }
      }
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.08 });

    function scan() {
      const nodes = Array.from(document.querySelectorAll(selector))
        .filter(node => !node.closest('[data-motion-static]'))
        .slice(0, 220);

      nodes.forEach((node, index) => {
        node.classList.add('motion-observed');
        node.style.setProperty('--motion-index', String(index % 10));
        observer.observe(node);
      });
    }

    const frame = window.requestAnimationFrame(scan);
    const lateScan = window.setTimeout(scan, 260);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(lateScan);
      observer.disconnect();
    };
  }, [location.pathname, location.search]);
}

function getVisitorId() {
  if (typeof window === 'undefined') return '';
  const key = 'rare_oud_visitor_id';
  let id = window.localStorage.getItem(key);
  if (!id) {
    id = window.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    window.localStorage.setItem(key, id);
  }
  return id;
}

function useSiteVisitTracking() {
  const location = useLocation();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const path = `${location.pathname}${location.search || ''}`;
    const sessionKey = `rare_oud_visit:${path}`;
    if (window.sessionStorage.getItem(sessionKey)) return;

    window.sessionStorage.setItem(sessionKey, '1');
    api.post('/analytics/visit', {
      path,
      referrer: document.referrer || '',
      visitor_id: getVisitorId()
    }, { skipAuthRefresh: true }).catch(() => {});
  }, [location.pathname, location.search]);
}

export default function App(){
  useExperienceMotion();
  useSiteVisitTracking();

  return <>
    <a className="skip-link" href="#main-content">Skip to content</a>
    <Navbar />
    <main className="app-main" id="main-content">
      <Suspense fallback={<PageLoader/>}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/products" element={<Products />} />
          <Route path="/category/:slug" element={<Products />} />
          <Route path="/products/:id" element={<ProductDetailPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/favorites" element={<Favorites />} />
          <Route path="/custom-order" element={<CustomOrder />} />
          <Route path="/my-orders" element={<MyOrders />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/links" element={<StaticPage slug="links" />} />
          <Route path="/accessories" element={<Products defaultCategory="accessories" />} />
          <Route path="/about" element={<StaticPage slug="about" />} />
          <Route path="/return-policy" element={<StaticPage slug="return-policy" />} />
          <Route path="/shipping" element={<StaticPage slug="shipping" />} />
          <Route path="/packaging" element={<StaticPage slug="packaging" />} />
          <Route path="/after-sales" element={<StaticPage slug="after-sales" />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/admin/*" element={<ProtectedAdminRoute><AdminDashboard /></ProtectedAdminRoute>} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </main>
    <Footer />
  </>
}
