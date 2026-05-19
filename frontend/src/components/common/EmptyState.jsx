import { Link } from 'react-router-dom';
export default function EmptyState({ title='لا توجد نتائج', body='جرّب تغيير معايير البحث أو الفلترة.', actionLabel='تصفح الأعواد', to='/products' }) {
  return <div className="card" style={{padding:'2rem',textAlign:'center',gridColumn:'1 / -1'}}>
    <h3 className="section-title">{title}</h3>
    <p className="muted">{body}</p>
    <Link className="btn" to={to}>{actionLabel}</Link>
  </div>
}
