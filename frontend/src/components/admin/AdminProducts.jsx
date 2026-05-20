import { useEffect, useState } from 'react';
import api from '../../services/api.js';
import { useLanguage } from '../../context/LanguageContext.jsx';

function slugify(v = '') {
  return v.toString().trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '').replace(/-+/g, '-') || `product-${Date.now()}`;
}

const empty = {
  category_id: '', slug: '', sku: '', name_ar: '', name_en: '', description_ar: '', description_en: '', price: '0', stock: '1',
  condition_status: 'new', dimensions: '', woods_ar: '', woods_en: '', included_accessories_ar: '', included_accessories_en: '',
  origin_country_ar: '', origin_country_en: '', maker_identity_ar: '', maker_identity_en: '', historical_geographic_classification_ar: '',
  historical_geographic_classification_en: '', is_featured: false, is_active: true
};

const MAX_PRODUCT_IMAGES = 4;
const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
const MAX_SOURCE_IMAGE_BYTES = 30 * 1024 * 1024;
const NORMALIZED_MAX_EDGE = 2200;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function fileBaseName(name = 'product-image') {
  return String(name).replace(/\.[^.]+$/, '').replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '') || 'product-image';
}

function canvasToBlob(canvas, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) resolve(blob);
      else reject(new Error('Image normalization failed'));
    }, 'image/jpeg', quality);
  });
}

async function decodeImage(file) {
  if ('createImageBitmap' in window) {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      return {
        width: bitmap.width,
        height: bitmap.height,
        draw: (ctx, width, height) => {
          ctx.drawImage(bitmap, 0, 0, width, height);
          bitmap.close?.();
        }
      };
    } catch {}
  }

  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Image could not be read by the browser'));
      img.src = url;
    });
    return {
      width: image.naturalWidth,
      height: image.naturalHeight,
      draw: (ctx, width, height) => ctx.drawImage(image, 0, 0, width, height)
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function normalizeImageFile(file) {
  const hasImageMime = file.type.startsWith('image/');
  const hasImageExtension = /\.(jpe?g|png|webp|heic|heif|avif)$/i.test(file.name || '');
  if (!hasImageMime && !hasImageExtension) {
    throw new Error('Unsupported image type');
  }
  if (file.size > MAX_SOURCE_IMAGE_BYTES) {
    throw new Error('Source image is too large');
  }

  const decoded = await decodeImage(file);
  if (!decoded.width || !decoded.height) {
    throw new Error('Image has invalid dimensions');
  }

  const scale = Math.min(1, NORMALIZED_MAX_EDGE / Math.max(decoded.width, decoded.height));
  const width = Math.max(1, Math.round(decoded.width * scale));
  const height = Math.max(1, Math.round(decoded.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('Image processing is unavailable');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  decoded.draw(ctx, width, height);

  let blob = await canvasToBlob(canvas, 0.88);
  if (blob.size > MAX_IMAGE_BYTES) blob = await canvasToBlob(canvas, 0.78);
  if (blob.size > MAX_IMAGE_BYTES) blob = await canvasToBlob(canvas, 0.68);
  if (blob.size > MAX_IMAGE_BYTES) {
    throw new Error('Normalized image is too large');
  }

  return new File([blob], `${fileBaseName(file.name)}.jpg`, {
    type: 'image/jpeg',
    lastModified: Date.now()
  });
}

function toForm(product) {
  const out = { ...empty };
  for (const key of Object.keys(out)) out[key] = product[key] ?? out[key];
  out.category_id = String(product.category_id || '');
  out.price = String(product.price ?? '0');
  out.stock = String(product.stock ?? '0');
  out.is_featured = !!product.is_featured;
  out.is_active = !!product.is_active;
  return out;
}

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(empty);
  const [files, setFiles] = useState([]);
  const [media, setMedia] = useState({ audio: '', video: '' });
  const [currentImages, setCurrentImages] = useState([]);
  const [editId, setEditId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const [processingImages, setProcessingImages] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [page, setPage] = useState({ limit: 50, offset: 0, total: 0 });
  const { lang } = useLanguage();
  const isArabic = lang === 'ar';

  async function load(nextOffset = page.offset) {
    const [p, c] = await Promise.all([api.get(`/products?limit=${page.limit}&offset=${nextOffset}`), api.get('/categories')]);
    setProducts(p.data.products || []);
    setPage(pg => ({ ...pg, offset: nextOffset, total: Number(p.data.total || 0) }));
    setCategories(c.data.categories || []);
    if (!form.category_id && c.data.categories?.[0]) setForm(f => ({ ...f, category_id: c.data.categories[0].id }));
  }

  useEffect(() => { load(0).catch(() => setError('تعذر تحميل بيانات المنتجات')); }, []);

  function set(k, v) {
    setSuccess('');
    setForm(f => ({ ...f, [k]: v, slug: k === 'name_en' && !f.slug ? slugify(v) : f.slug }));
  }

  async function handleFileSelection(event) {
    const selected = Array.from(event.target.files || []);

    if (selected.length > MAX_PRODUCT_IMAGES) {
      setFiles([]);
      event.target.value = '';
      setError(isArabic ? 'يمكنك رفع 4 صور كحد أقصى لكل منتج.' : 'Upload up to 4 images per product.');
      return;
    }

    const unsupported = selected.find(file => file.type && !ALLOWED_IMAGE_TYPES.has(file.type) && !file.type.startsWith('image/'));
    if (unsupported) {
      setFiles([]);
      event.target.value = '';
      setError(isArabic ? 'الملف المحدد ليس صورة قابلة للرفع.' : 'The selected file is not a supported image.');
      return;
    }

    const tooLarge = selected.find(file => file.size > MAX_SOURCE_IMAGE_BYTES);
    if (tooLarge) {
      setFiles([]);
      event.target.value = '';
      setError(isArabic ? 'حجم الصورة كبير جدًا. اختر صورة حتى 30MB وسنضغطها تلقائيًا.' : 'Image is too large. Select an image up to 30MB and it will be optimized automatically.');
      return;
    }

    setProcessingImages(true);
    setError('');
    setSuccess('');
    try {
      const normalized = await Promise.all(selected.map(normalizeImageFile));
      setFiles(normalized);
      setSuccess(isArabic ? 'تم تجهيز الصور للرفع بصيغة آمنة.' : 'Images optimized and ready to upload.');
    } catch {
      setFiles([]);
      event.target.value = '';
      setError(isArabic ? 'تعذر قراءة الصورة. جرّب اختيارها من المعرض الأصلي أو أرسلها كصورة JPG/PNG.' : 'Unable to read this image. Choose it from the original gallery or use a JPG/PNG export.');
    } finally {
      setProcessingImages(false);
    }
  }

  function payloadFromForm() {
    return {
      ...form,
      category_id: Number(form.category_id),
      price: Number(form.price),
      stock: Number(form.stock),
      is_featured: !!form.is_featured,
      is_active: !!form.is_active
    };
  }

  async function startEdit(product) {
    setEditId(product.id);
    setFiles([]);
    setFileInputKey(v => v + 1);
    setMedia({ audio: '', video: '' });
    setCurrentImages([]);
    setForm(toForm(product));
    try {
      const { data } = await api.get(`/products/${product.slug}`);
      setCurrentImages(data.images || []);
      const audio = (data.media || []).find(m => m.media_type === 'audio')?.drive_url || '';
      const video = (data.media || []).find(m => m.media_type === 'video')?.drive_url || '';
      setMedia({ audio, video });
    } catch {
      setCurrentImages([]);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelEdit() {
    setEditId(null);
    setFiles([]);
    setFileInputKey(v => v + 1);
    setMedia({ audio: '', video: '' });
    setCurrentImages([]);
    setForm(categories[0] ? { ...empty, category_id: categories[0].id } : empty);
  }

  async function refreshSavedProduct(id, slug) {
    const { data } = await api.get(`/products/${slug}`);
    setEditId(id);
    setForm(toForm(data.product || { ...form, id }));
    setCurrentImages(data.images || []);
    const audio = (data.media || []).find(m => m.media_type === 'audio')?.drive_url || '';
    const video = (data.media || []).find(m => m.media_type === 'video')?.drive_url || '';
    setMedia({ audio, video });
  }

  async function save(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      const payload = payloadFromForm();
      let id = editId;
      const savedSlug = payload.slug;
      const uploadedCount = files.length;
      if (editId) {
        await api.put(`/products/${editId}`, payload);
      } else {
        const { data } = await api.post('/products', payload);
        id = data.id;
      }
      if (files.length) {
        const fd = new FormData();
        files.forEach(f => fd.append('images', f));
        await api.post(`/products/${id}/images`, fd, { timeout: 120000 });
      }
      if (media.audio) await api.post(`/products/${id}/media`, { media_type: 'audio', title_ar: 'عينة صوت', title_en: 'Audio sample', drive_url: media.audio });
      if (media.video) await api.post(`/products/${id}/media`, { media_type: 'video', title_ar: 'فيديو', title_en: 'Video', drive_url: media.video });
      await load(editId ? page.offset : 0);
      await refreshSavedProduct(id, savedSlug);
      setFiles([]);
      setFileInputKey(v => v + 1);
      setSuccess(
        uploadedCount
          ? (isArabic ? `تم حفظ المنتج ورفع ${uploadedCount} صورة. الصور المحفوظة ظاهرة بالأسفل الآن.` : `Product saved and ${uploadedCount} image(s) uploaded. Saved images are shown below.`)
          : (isArabic ? 'تم حفظ المنتج وتحديث البيانات بنجاح.' : 'Product saved and refreshed successfully.')
      );
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err.response?.data?.message || 'تعذر حفظ المنتج');
    } finally {
      setSaving(false);
    }
  }

  async function remove(id) {
    if (confirm(isArabic ? 'هل تريد حذف المنتج؟' : 'Delete product?')) {
      await api.delete(`/products/${id}`);
      await load(page.offset);
    }
  }

  async function deleteImage(imageId) {
    if (!editId || !confirm(isArabic ? 'هل تريد حذف هذه الصورة؟' : 'Delete this image?')) return;
    setError('');
    try {
      await api.delete(`/products/${editId}/images/${imageId}`);
      setCurrentImages(imgs => imgs.filter(img => img.id !== imageId));
    } catch (err) {
      setError(err.response?.data?.message || 'تعذر حذف الصورة');
    }
  }

  const canPrev = page.offset > 0;
  const canNext = page.offset + page.limit < page.total;
  const selectedCategory = categories.find(category => String(category.id) === String(form.category_id));
  const isAccessoryProduct = selectedCategory?.slug === 'accessories';

  return <div>
    <h2>{editId ? (isArabic ? 'تعديل المنتج' : 'Edit Product') : (isArabic ? 'المنتجات' : 'Products')}</h2>
    {error && <p className="error-box">{error}</p>}
    {success && <p className="success-box">{success}</p>}
    <form className="card admin-form" onSubmit={save}>
      <div className="admin-grid">
        <label>{isArabic ? 'التصنيف' : 'Category'}<select required value={form.category_id} onChange={e => set('category_id', e.target.value)}>{categories.map(c => <option key={c.id} value={c.id}>{c.name_ar} / {c.name_en}</option>)}</select></label>
        <label>{isArabic ? 'المعرّف' : 'Slug'}<input required value={form.slug} onChange={e => set('slug', e.target.value)} /></label>
        <label>{isArabic ? 'الاسم العربي' : 'Arabic name'}<input required value={form.name_ar} onChange={e => set('name_ar', e.target.value)} /></label>
        <label>{isArabic ? 'الاسم الإنجليزي' : 'English name'}<input required value={form.name_en} onChange={e => set('name_en', e.target.value)} /></label>
        <label>{isArabic ? 'السعر' : 'Price'}<input required type="number" min="0" step="0.01" value={form.price} onChange={e => set('price', e.target.value)} /></label>
        <label>{isArabic ? 'المخزون' : 'Stock'}<input required type="number" min="0" value={form.stock} onChange={e => set('stock', e.target.value)} /></label>
        <label>{isArabic ? 'الحالة' : 'Condition'}<select value={form.condition_status} onChange={e => set('condition_status', e.target.value)}><option value="new">{isArabic ? 'جديد' : 'New'}</option><option value="used">{isArabic ? 'مستعمل' : 'Used'}</option></select></label>
        <label>{isArabic ? 'الصور (حتى 4 صور)' : 'Images (up to 4)'}<input key={fileInputKey} type="file" accept="image/*" multiple onChange={handleFileSelection} disabled={processingImages || saving} />{processingImages && <span className="muted">{isArabic ? 'جارٍ تجهيز الصور...' : 'Optimizing images...'}</span>}{!processingImages && files.length > 0 && <span className="muted">{isArabic ? `${files.length} صورة جاهزة للحفظ` : `${files.length} image(s) ready to save`}</span>}</label>
        <label>{isArabic ? 'رابط الفيديو من Drive' : 'Video Drive URL'}<input value={media.video} onChange={e => setMedia({ ...media, video: e.target.value })} /></label>
        <label>{isArabic ? 'رابط الصوت من Drive' : 'Audio Drive URL'}<input value={media.audio} onChange={e => setMedia({ ...media, audio: e.target.value })} /></label>
        <label>{isArabic ? 'الوصف العربي' : 'Arabic description'}<textarea value={form.description_ar} onChange={e => set('description_ar', e.target.value)} /></label>
        <label>{isArabic ? 'الوصف الإنجليزي' : 'English description'}<textarea value={form.description_en} onChange={e => set('description_en', e.target.value)} /></label>
        <label>{isAccessoryProduct ? (isArabic ? 'المادة بالعربية' : 'Material AR') : (isArabic ? 'الأخشاب بالعربية' : 'Woods AR')}<input value={form.woods_ar} onChange={e => set('woods_ar', e.target.value)} /></label>
        <label>{isAccessoryProduct ? (isArabic ? 'المادة بالإنجليزية' : 'Material EN') : (isArabic ? 'الأخشاب بالإنجليزية' : 'Woods EN')}<input value={form.woods_en} onChange={e => set('woods_en', e.target.value)} /></label>
        <label>{isAccessoryProduct ? (isArabic ? 'تفاصيل الإكسسوار بالعربية' : 'Accessory details AR') : (isArabic ? 'الإكسسوارات بالعربية' : 'Accessories AR')}<input value={form.included_accessories_ar} onChange={e => set('included_accessories_ar', e.target.value)} /></label>
        <label>{isAccessoryProduct ? (isArabic ? 'تفاصيل الإكسسوار بالإنجليزية' : 'Accessory details EN') : (isArabic ? 'الإكسسوارات بالإنجليزية' : 'Accessories EN')}<input value={form.included_accessories_en} onChange={e => set('included_accessories_en', e.target.value)} /></label>
        <label>{isArabic ? 'المنشأ بالعربية' : 'Origin AR'}<input value={form.origin_country_ar} onChange={e => set('origin_country_ar', e.target.value)} /></label>
        <label>{isArabic ? 'المنشأ بالإنجليزية' : 'Origin EN'}<input value={form.origin_country_en} onChange={e => set('origin_country_en', e.target.value)} /></label>
        <label>{isArabic ? 'الصانع بالعربية' : 'Maker AR'}<input value={form.maker_identity_ar} onChange={e => set('maker_identity_ar', e.target.value)} /></label>
        <label>{isArabic ? 'الصانع بالإنجليزية' : 'Maker EN'}<input value={form.maker_identity_en} onChange={e => set('maker_identity_en', e.target.value)} /></label>
        <label>{isAccessoryProduct ? (isArabic ? 'نوع الإكسسوار بالعربية (يظهر كفلتر)' : 'Accessory type AR (filter option)') : (isArabic ? 'التصنيف التاريخي/الجغرافي بالعربية' : 'Historical/Geo AR')}<input value={form.historical_geographic_classification_ar} onChange={e => set('historical_geographic_classification_ar', e.target.value)} /></label>
        <label>{isAccessoryProduct ? (isArabic ? 'نوع الإكسسوار بالإنجليزية (يظهر كفلتر)' : 'Accessory type EN (filter option)') : (isArabic ? 'التصنيف التاريخي/الجغرافي بالإنجليزية' : 'Historical/Geo EN')}<input value={form.historical_geographic_classification_en} onChange={e => set('historical_geographic_classification_en', e.target.value)} /></label>
        <label><input type="checkbox" checked={form.is_featured} onChange={e => set('is_featured', e.target.checked)} /> {isArabic ? 'مميز' : 'Featured'}</label>
        <label><input type="checkbox" checked={form.is_active} onChange={e => set('is_active', e.target.checked)} /> {isArabic ? 'مفعل' : 'Active'}</label>
      </div>
      {editId && currentImages.length > 0 && <div className="card" style={{padding:'1rem',marginTop:'1rem'}}><h3>{isArabic ? 'صور المنتج' : 'Product Images'}</h3><div className="thumb-row">{currentImages.map(img => <div key={img.id} style={{display:'grid',gap:'.5rem'}}><img src={`${(import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace('/api','')}${img.image_url}`} alt={isArabic ? 'صورة المنتج' : 'Product'} loading="lazy" decoding="async"/><button type="button" className="icon-btn" onClick={() => deleteImage(img.id)}>{isArabic ? 'حذف' : 'Delete'}</button></div>)}</div></div>}
      <div className="actions-row"><button className="btn" disabled={saving || processingImages}>{processingImages ? (isArabic ? 'جارٍ تجهيز الصور...' : 'Optimizing images...') : saving ? (isArabic ? 'جارٍ الحفظ...' : 'Saving...') : (editId ? (isArabic ? 'حفظ التعديلات' : 'Save Changes') : (isArabic ? 'إضافة منتج' : 'Add Product'))}</button>{editId && <button type="button" className="btn btn-ghost" onClick={cancelEdit} disabled={saving || processingImages}>{isArabic ? 'إلغاء التعديل' : 'Cancel Edit'}</button>}</div>
    </form>
    <div className="actions-row"><button className="icon-btn" disabled={!canPrev} onClick={() => load(Math.max(page.offset - page.limit, 0))}>{isArabic ? 'السابق' : 'Prev'}</button><span>{page.offset + 1}-{Math.min(page.offset + page.limit, page.total)} / {page.total}</span><button className="icon-btn" disabled={!canNext} onClick={() => load(page.offset + page.limit)}>{isArabic ? 'التالي' : 'Next'}</button></div>
    <table className="table"><thead><tr><th>{isArabic ? 'الاسم' : 'Name'}</th><th>{isArabic ? 'السعر' : 'Price'}</th><th>{isArabic ? 'المخزون' : 'Stock'}</th><th>{isArabic ? 'مفعل' : 'Active'}</th><th></th></tr></thead><tbody>{products.map(p => <tr key={p.id}><td>{p.name_ar || p.name_en}</td><td>${p.price}</td><td>{p.stock}</td><td>{p.is_active ? (isArabic ? 'نعم' : 'Yes') : (isArabic ? 'لا' : 'No')}</td><td><button className="icon-btn" onClick={() => startEdit(p)}>{isArabic ? 'تعديل' : 'Edit'}</button> <button className="icon-btn" onClick={() => remove(p.id)}>{isArabic ? 'حذف' : 'Delete'}</button></td></tr>)}</tbody></table>
  </div>;
}
