const logger = require('../utils/logger');
const {body,query,validationResult}=require('express-validator'); const db=require('../config/database'); const {transaction}=db; const {audit}=require('../utils/audit'); const objectStorage=require('../utils/objectStorage'); const productService=require('../services/productService');
const MAX_PRODUCT_IMAGES = 4;
function fail(req,res){const e=validationResult(req); if(!e.isEmpty()){res.status(422).json({errors:e.array()}); return true;} return false;}
const fields='p.*,c.name_ar category_name_ar,c.name_en category_name_en,(SELECT image_url FROM product_images WHERE product_id=p.id ORDER BY is_primary DESC,sort_order ASC,id ASC LIMIT 1) primary_image,(SELECT COUNT(*) FROM favorites f WHERE f.product_id=p.id) likes_count,(SELECT ROUND(AVG(rating),1) FROM product_reviews r WHERE r.product_id=p.id AND r.is_approved=TRUE AND r.deleted_at IS NULL) avg_rating';
exports.validate=[body('category_id').isInt(),body('slug').trim().isLength({min:2,max:160}),body('name_ar').trim().isLength({min:2,max:220}),body('name_en').trim().isLength({min:2,max:220}),body('price').isFloat({min:0}),body('stock').isInt({min:0}),body('condition_status').optional().isIn(['new','used'])];
exports.listValidate=[query('min_price').optional({checkFalsy:true}).isFloat({min:0,max:999999.99}).toFloat(),query('max_price').optional({checkFalsy:true}).isFloat({min:0,max:999999.99}).toFloat(),query('limit').optional({checkFalsy:true}).isInt({min:1,max:100}).toInt(),query('offset').optional({checkFalsy:true}).isInt({min:0,max:1000000}).toInt()];
exports.list=async(req,res,next)=>{try{if(fail(req,res))return; res.json(await productService.listProducts(req.query));}catch(e){next(e)}};
exports.get=async(req,res,next)=>{try{res.json(await productService.getProductBySlug(req.params.slug));}catch(e){next(e)}};
exports.create=async(req,res,next)=>{try{if(fail(req,res))return; const body=req.body; const id=await transaction(async(conn)=>{const [r]=await conn.execute(`INSERT INTO products (category_id,slug,sku,name_ar,name_en,description_ar,description_en,price,compare_at_price,stock,condition_status,dimensions,woods_ar,woods_en,included_accessories_ar,included_accessories_en,origin_country_ar,origin_country_en,maker_identity_ar,maker_identity_en,historical_geographic_classification_ar,historical_geographic_classification_en,is_featured,is_active) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,[body.category_id,body.slug,body.sku||null,body.name_ar,body.name_en,body.description_ar||null,body.description_en||null,body.price,body.compare_at_price||null,body.stock,body.condition_status||'new',body.dimensions||null,body.woods_ar||null,body.woods_en||null,body.included_accessories_ar||null,body.included_accessories_en||null,body.origin_country_ar||null,body.origin_country_en||null,body.maker_identity_ar||null,body.maker_identity_en||null,body.historical_geographic_classification_ar||null,body.historical_geographic_classification_en||null,!!body.is_featured,body.is_active??true]); return r.insertId;}); await audit(req,'create','product',id,body); productService.invalidateProductCache(); res.status(201).json({id});}catch(e){next(e)}};
exports.update=async(req,res,next)=>{try{if(fail(req,res))return; const existing=await db.query('SELECT id FROM products WHERE id=:id AND deleted_at IS NULL LIMIT 1',{id:req.params.id}); if(!existing.length)return res.status(404).json({message:'Product not found',code:'PRODUCT_NOT_FOUND'}); const b=req.body; await db.query(`UPDATE products SET category_id=:category_id,slug=:slug,sku=:sku,name_ar=:name_ar,name_en=:name_en,description_ar=:description_ar,description_en=:description_en,price=:price,compare_at_price=:compare_at_price,stock=:stock,condition_status=:condition_status,dimensions=:dimensions,woods_ar=:woods_ar,woods_en=:woods_en,included_accessories_ar=:included_accessories_ar,included_accessories_en=:included_accessories_en,origin_country_ar=:origin_country_ar,origin_country_en=:origin_country_en,maker_identity_ar=:maker_identity_ar,maker_identity_en=:maker_identity_en,historical_geographic_classification_ar=:historical_geographic_classification_ar,historical_geographic_classification_en=:historical_geographic_classification_en,is_featured=:is_featured,is_active=:is_active WHERE id=:id`,{...b,id:req.params.id,sku:b.sku||null,description_ar:b.description_ar||null,description_en:b.description_en||null,compare_at_price:b.compare_at_price||null,condition_status:b.condition_status||'new',dimensions:b.dimensions||null,woods_ar:b.woods_ar||null,woods_en:b.woods_en||null,included_accessories_ar:b.included_accessories_ar||null,included_accessories_en:b.included_accessories_en||null,origin_country_ar:b.origin_country_ar||null,origin_country_en:b.origin_country_en||null,maker_identity_ar:b.maker_identity_ar||null,maker_identity_en:b.maker_identity_en||null,historical_geographic_classification_ar:b.historical_geographic_classification_ar||null,historical_geographic_classification_en:b.historical_geographic_classification_en||null,is_featured:!!b.is_featured,is_active:b.is_active??true}); await audit(req,'update','product',req.params.id,b); productService.invalidateProductCache(); res.json({message:'Product updated'});}catch(e){next(e)}};
exports.remove=async(req,res,next)=>{try{const existing=await db.query('SELECT id FROM products WHERE id=:id AND deleted_at IS NULL LIMIT 1',{id:req.params.id}); if(!existing.length)return res.status(404).json({message:'Product not found',code:'PRODUCT_NOT_FOUND'}); await db.query('UPDATE products SET deleted_at=CURRENT_TIMESTAMP,is_active=FALSE WHERE id=:id',{id:req.params.id}); await audit(req,'soft_delete','product',req.params.id); productService.invalidateProductCache(); res.json({message:'Product deleted'});}catch(e){next(e)}};
async function deleteLocalUploadUrl(imageUrl) {
  if (!imageUrl || !imageUrl.startsWith('/uploads/')) return;
  const fs = require('fs/promises');
  const path = require('path');
  const uploadsRoot = path.resolve(__dirname, '..', 'uploads');
  const relative = imageUrl.replace(/^\/uploads\//, '');
  const filePath = path.resolve(uploadsRoot, relative);
  if (filePath.startsWith(uploadsRoot)) await fs.unlink(filePath).catch(err => {
    if (err.code !== 'ENOENT') logger.warn('Failed to delete product image file', { error: err.message });
  });
}
async function cleanupPersistedUploads(files = []) {
  for (const file of files) {
    const imageUrl = file.public_url || `/uploads/products/${file.filename}`;
    if (file.public_url && !file.public_url.startsWith('/uploads/')) await objectStorage.deleteByUrl(file.public_url).catch(() => false);
    await deleteLocalUploadUrl(imageUrl);
    for (const variant of file.variants || []) {
      if (variant.url && variant.url.startsWith('/uploads/')) await deleteLocalUploadUrl(variant.url);
      else if (variant.url) await objectStorage.deleteByUrl(variant.url).catch(() => false);
    }
  }
}
async function readLocalImageBuffer(file) {
  if (file.public_url || !file.path) return null;
  const fs = require('fs/promises');
  return fs.readFile(file.path);
}
let imageBlobTableReady = false;
async function ensureImageBlobTable() {
  if (imageBlobTableReady) return;
  await db.query(`
    CREATE TABLE IF NOT EXISTS product_image_blobs (
      image_id BIGINT UNSIGNED PRIMARY KEY,
      content_type VARCHAR(100) NOT NULL DEFAULT 'image/webp',
      byte_size INT UNSIGNED NOT NULL,
      data LONGBLOB NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_image_blobs_image FOREIGN KEY (image_id) REFERENCES product_images(id) ON DELETE CASCADE
    ) ENGINE=InnoDB
  `);
  imageBlobTableReady = true;
}
exports.addImages=async(req,res,next)=>{
  try{
    await ensureImageBlobTable().catch(error => logger.warn('Product image blob table setup failed', { error: error.message }));
    const productId=req.params.id;
    const existing=await db.query('SELECT id FROM products WHERE id=:id AND deleted_at IS NULL LIMIT 1',{id:productId});
    const files=req.files||[];
    if(!existing.length){await cleanupPersistedUploads(files);return res.status(404).json({message:'Product not found',code:'PRODUCT_NOT_FOUND'});}
    if(!files.length)return res.status(400).json({message:'No images uploaded',code:'NO_IMAGES_UPLOADED'});
    const countRows=await db.query('SELECT COUNT(*) total FROM product_images WHERE product_id=:id',{id:productId});
    const existingCount=Number(countRows[0]?.total||0);
    if(existingCount+files.length>MAX_PRODUCT_IMAGES){await cleanupPersistedUploads(files);return res.status(400).json({message:`Each product can have up to ${MAX_PRODUCT_IMAGES} images`,code:'PRODUCT_IMAGE_LIMIT_EXCEEDED',limit:MAX_PRODUCT_IMAGES,existing:existingCount,remaining:Math.max(0,MAX_PRODUCT_IMAGES-existingCount)});}
    const requestedPrimary=Number(req.body.primary_index);
    const primaryIndex=Number.isInteger(requestedPrimary)&&requestedPrimary>=0&&requestedPrimary<files.length?requestedPrimary:(existingCount===0?0:-1);
    const insertedFiles=[];
    await transaction(async(conn)=>{
      if(primaryIndex>=0)await conn.execute('UPDATE product_images SET is_primary=FALSE WHERE product_id=?',[productId]);
      for(let i=0;i<files.length;i++){
        const initialUrl=files[i].public_url || `/uploads/products/${files[i].filename}`;
        const [result]=await conn.execute('INSERT INTO product_images (product_id,image_url,storage_key,variants_json,sort_order,is_primary) VALUES (?,?,?,?,?,?)',[productId,initialUrl,files[i].storage_key||null,JSON.stringify(files[i].variants||[]),existingCount+i,i===primaryIndex]);
        let imageUrl=initialUrl;
        if(!files[i].public_url){
          const imageId=result.insertId;
          const buffer=await readLocalImageBuffer(files[i]);
          try {
            await conn.execute('INSERT INTO product_image_blobs (image_id,content_type,byte_size,data) VALUES (?,?,?,?)',[imageId,'image/webp',buffer.length,buffer]);
            imageUrl=`/api/products/${productId}/images/${imageId}/file`;
            await conn.execute('UPDATE product_images SET image_url=? WHERE id=?',[imageUrl,imageId]);
          } catch (blobError) {
            logger.warn('Persistent image blob insert failed; falling back to local upload URL', { error: blobError.message, productId, imageId });
          }
        }
        insertedFiles.push(imageUrl);
      }
    });
    await audit(req,'upload_images','product',productId,{count:files.length,primary_index:primaryIndex});
    productService.invalidateProductCache();
    res.status(201).json({files:insertedFiles});
  }catch(e){next(e)}
};
exports.setPrimaryImage=async(req,res,next)=>{try{const rows=await db.query('SELECT id,product_id FROM product_images WHERE id=:imageId AND product_id=:productId LIMIT 1',{imageId:req.params.imageId,productId:req.params.id}); if(!rows.length)return res.status(404).json({message:'Image not found',code:'IMAGE_NOT_FOUND'}); await transaction(async(conn)=>{await conn.execute('UPDATE product_images SET is_primary=FALSE WHERE product_id=?',[req.params.id]); await conn.execute('UPDATE product_images SET is_primary=TRUE WHERE id=? AND product_id=?',[req.params.imageId,req.params.id]);}); await audit(req,'set_primary_image','product',req.params.id,{image_id:req.params.imageId}); productService.invalidateProductCache(); res.json({message:'Primary image updated'});}catch(e){next(e)}};
exports.getImageFile=async(req,res,next)=>{try{await ensureImageBlobTable(); const rows=await db.query(`SELECT b.content_type,b.byte_size,b.data FROM product_image_blobs b JOIN product_images pi ON pi.id=b.image_id JOIN products p ON p.id=pi.product_id WHERE b.image_id=:imageId AND pi.product_id=:productId AND p.deleted_at IS NULL LIMIT 1`,{imageId:req.params.imageId,productId:req.params.id}); if(!rows.length)return res.status(404).json({message:'Image not found',code:'IMAGE_NOT_FOUND'}); const image=rows[0]; res.setHeader('Content-Type',image.content_type||'image/webp'); res.setHeader('Content-Length',String(image.byte_size||image.data.length)); res.setHeader('Cache-Control','public, max-age=31536000, immutable'); res.setHeader('Cross-Origin-Resource-Policy','cross-origin'); res.send(image.data);}catch(e){next(e)}};
exports.addMedia=async(req,res,next)=>{try{if(fail(req,res))return; const existing=await db.query('SELECT id FROM products WHERE id=:id AND deleted_at IS NULL LIMIT 1',{id:req.params.id}); if(!existing.length)return res.status(404).json({message:'Product not found',code:'PRODUCT_NOT_FOUND'}); const {media_type,title_ar,title_en,drive_url}=req.body; await db.query('DELETE FROM product_media_links WHERE product_id=:product_id AND media_type=:media_type',{product_id:req.params.id,media_type}); const r=await db.query('INSERT INTO product_media_links (product_id,media_type,title_ar,title_en,drive_url) VALUES (:product_id,:media_type,:title_ar,:title_en,:drive_url)',{product_id:req.params.id,media_type,title_ar:title_ar||null,title_en:title_en||null,drive_url}); await audit(req,'upsert_media','product',req.params.id,req.body); productService.invalidateProductCache(); res.status(201).json({id:r.insertId});}catch(e){next(e)}};

exports.deleteImage = async (req, res, next) => {
  try {
    const rows = await db.query(
      'SELECT id,image_url,variants_json,is_primary FROM product_images WHERE id=:imageId AND product_id=:productId LIMIT 1',
      { imageId: req.params.imageId, productId: req.params.id }
    );
    if (!rows.length) return res.status(404).json({ message: 'Image not found', code: 'IMAGE_NOT_FOUND' });
    const image = rows[0];
    await transaction(async (conn) => {
      await conn.execute('DELETE FROM product_images WHERE id=? AND product_id=?', [req.params.imageId, req.params.id]);
      if (image.is_primary) {
        const [nextImages] = await conn.execute('SELECT id FROM product_images WHERE product_id=? ORDER BY sort_order ASC,id ASC LIMIT 1', [req.params.id]);
        await conn.execute('UPDATE product_images SET is_primary=FALSE WHERE product_id=?', [req.params.id]);
        if (nextImages.length) await conn.execute('UPDATE product_images SET is_primary=TRUE WHERE id=?', [nextImages[0].id]);
      }
    });
    if (image.image_url && !image.image_url.startsWith('/uploads/')) {
      await objectStorage.deleteByUrl(image.image_url).catch(() => false);
      try {
        const variants = JSON.parse(image.variants_json || '[]');
        await Promise.all(variants.map(v => v.url ? objectStorage.deleteByUrl(v.url).catch(() => false) : Promise.resolve(false)));
      } catch {}
    }
    if (image.image_url && image.image_url.startsWith('/uploads/')) {
      await deleteLocalUploadUrl(image.image_url);
      try {
        const variants = JSON.parse(image.variants_json || '[]');
        await Promise.all(variants.map(v => v.url && v.url.startsWith('/uploads/') ? deleteLocalUploadUrl(v.url) : Promise.resolve(false)));
      } catch {}
    }
    await audit(req, 'delete_image', 'product', req.params.id, { image_id: req.params.imageId });
    productService.invalidateProductCache();
    res.json({ message: 'Image deleted' });
  } catch (e) { next(e); }
};
