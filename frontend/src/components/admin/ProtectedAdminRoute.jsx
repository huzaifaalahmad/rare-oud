import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useLanguage } from '../../context/LanguageContext.jsx';

export default function ProtectedAdminRoute({ children }) {
  const { user, isAdmin, loading } = useAuth();
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const isArabic = lang === 'ar';

  useEffect(() => {
    if (user && !isAdmin && !loading) {
      const timer = setTimeout(() => navigate('/', { replace: true }), 2200);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [user, isAdmin, loading, navigate]);

  if (loading) {
    return (
      <section className="section container">
        <div className="card" style={{ padding: '1rem' }}>
          {isArabic ? 'يتم التحقق من صلاحيات الإدارة...' : 'Checking admin session...'}
        </div>
      </section>
    );
  }

  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;

  if (!isAdmin) {
    return (
      <section className="section container">
        <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
          <h1>{isArabic ? 'غير مصرح' : 'Access denied'}</h1>
          <p>
            {isArabic
              ? 'لا تملك صلاحية الوصول إلى لوحة الإدارة. سيتم تحويلك إلى الصفحة الرئيسية.'
              : 'You do not have permission to access the admin dashboard. Redirecting to home.'}
          </p>
        </div>
      </section>
    );
  }

  return children;
}
