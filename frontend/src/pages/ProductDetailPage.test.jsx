import React,{act} from 'react';
import {createRoot} from 'react-dom/client';
import {MemoryRouter,Routes,Route} from 'react-router-dom';
import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import api from '../services/api.js';
import ProductDetailPage from './ProductDetailPage.jsx';
vi.mock('../services/api.js',()=>({default:{get:vi.fn(),post:vi.fn()}}));
vi.mock('../context/AuthContext.jsx',()=>({useAuth:()=>({user:null})}));
vi.mock('../context/LanguageContext.jsx',()=>({useLanguage:()=>({lang:'en',tr:key=>key})}));
let host,root;
beforeEach(()=>{globalThis.IS_REACT_ACT_ENVIRONMENT=true;host=document.createElement('div');document.body.appendChild(host);root=createRoot(host);api.get.mockReset();});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();});
const product={id:1,name_en:'Test oud',price:160,stock:1,category_id:2,primary_image:'/first.jpg',dimensions:'Length 0 cm / Width 0 cm / Weight 0 kg'};
async function render(settingsFail=false){
 api.get.mockImplementation(url=>url.includes('/content/')?(settingsFail?Promise.reject(new Error('offline')):Promise.resolve({data:{settings:[{setting_key:'whatsapp_phone',value_ar:'963981653408'}]}})):Promise.resolve({data:{product,images:[{image_url:'/first.jpg'},{image_url:'/second.jpg'}]}}));
 await act(async()=>root.render(<MemoryRouter initialEntries={['/products/test']} future={{v7_startTransition:true,v7_relativeSplatPath:true}}><Routes><Route path='/products/:id' element={<ProductDetailPage/>}/></Routes></MemoryRouter>));
 await act(async()=>{await new Promise(r=>setTimeout(r,0))});
}
it('shows real gallery count and missing dimensions with a direct enquiry link',async()=>{
 await render();expect(host.querySelector('.gallery-count').textContent).toBe('2 product images');
 expect(host.querySelectorAll('.thumb-button')).toHaveLength(2);expect(host.querySelectorAll('.thumb-placeholder')).toHaveLength(0);
 expect(host.textContent).toContain('Not specified');expect(host.querySelector('a[href^="https://wa.me/"]').href).toContain('963981653408');
 await act(async()=>[...host.querySelectorAll('button')].find(b=>b.textContent.includes('Request Product')).click());
 expect(host.querySelector('input[type=number]').getAttribute('aria-label')).toBe('Quantity');
});
it('offers contact instead of inventing a phone number if settings fail',async()=>{
 await render(true);expect(host.querySelector('a[href^="https://wa.me/"]')).toBeNull();expect(host.querySelector('a[href="/contact"]')).not.toBeNull();
});
