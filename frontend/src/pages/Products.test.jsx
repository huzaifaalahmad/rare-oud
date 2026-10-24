import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../services/api.js';
import Products from './Products.jsx';

vi.mock('../services/api.js', () => ({ default: { get: vi.fn() } }));
vi.mock('../context/LanguageContext.jsx', () => ({ useLanguage: () => ({ lang:'en',tr:key=>key }) }));
vi.mock('../components/products/ProductCard.jsx', () => ({ default: ({product})=><article data-product>{product.name_en}</article> }));
vi.mock('../components/products/ProductFilters.jsx', () => ({ default: ()=><div>Filters</div> }));
let container,root;
const flush = () => act(async () => { await new Promise(resolve=>setTimeout(resolve,0)); });
beforeEach(()=>{Element.prototype.scrollIntoView=vi.fn();globalThis.IS_REACT_ACT_ENVIRONMENT=true;container=document.createElement('div');document.body.appendChild(container);root=createRoot(container);api.get.mockReset();});
afterEach(async()=>{await act(async()=>root.unmount());container.remove();});
async function render(defaultCategory){await act(async()=>root.render(<MemoryRouter future={{v7_startTransition:true,v7_relativeSplatPath:true}}><Products defaultCategory={defaultCategory}/></MemoryRouter>));await flush();}
describe('catalogue request outcomes',()=>{
 it('shows an actual loading state, then total-based pages and the next page request',async()=>{
  let resolve;api.get.mockImplementationOnce(()=>new Promise(done=>{resolve=done}));
  api.get.mockResolvedValue({data:{products:[{id:13,name_en:'Next instrument'}],total:38}});
  await render();expect(container.textContent).toContain('Loading collection');expect(container.textContent).not.toContain('0 results');
  await act(async()=>resolve({data:{products:Array.from({length:12},(_,id)=>({id,name_en:'Instrument '+id})),total:38}}));await flush();
  expect(container.querySelectorAll('[data-product]')).toHaveLength(12);expect(container.textContent).toContain('Page 1 of 4');
  const next=Array.from(container.querySelectorAll('button')).find(b=>b.textContent==='Next');
  await act(async()=>next.click());await flush();
  expect(api.get.mock.calls.at(-1)[1].params.offset).toBe(12);expect(api.get.mock.calls.at(-1)[1].params.kind).toBe('oud');expect(container.textContent).toContain('Page 2 of 4');
 });
 it('requests accessories as a separate server collection',async()=>{
  api.get.mockResolvedValue({data:{products:[],total:0}});
  await render('accessories');
  expect(api.get.mock.calls.at(-1)[1].params).toMatchObject({kind:'accessory',category:'accessories',offset:0});
 });
 it('distinguishes failure from no results and recovers through retry',async()=>{
  api.get.mockRejectedValueOnce(new Error('offline')).mockResolvedValue({data:{products:[],total:0}});
  await render();expect(container.querySelector('[role=alert]').textContent).toContain('could not be loaded');
  await act(async()=>Array.from(container.querySelectorAll('button')).find(b=>b.textContent==='Try again').click());await flush();
  expect(container.querySelector('[role=alert]')).toBeNull();expect(container.querySelector('[role=status]').textContent).toContain('noResults');
 });
});
