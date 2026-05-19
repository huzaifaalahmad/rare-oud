export default function SkeletonGrid({count=8}){
 return <div className="grid product-grid" aria-label="loading products">{Array.from({length:count}).map((_,i)=><div className="card" key={i} style={{height:310,background:'linear-gradient(100deg,var(--surface),var(--surface-2),var(--surface))',backgroundSize:'220% 100%',animation:'reveal .8s ease both'}} />)}</div>
}
