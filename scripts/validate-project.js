const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const mustExist = [
  'database/schema.sql',
  'backend/server.js',
  'backend/config/database.js',
  'backend/routes/auth.js',
  'backend/routes/products.js',
  'backend/routes/orders.js',
  'frontend/src/App.jsx',
  'frontend/src/styles/globals.css',
  'frontend/src/context/LanguageContext.jsx',
  'frontend/src/context/ThemeContext.jsx',
  'README.md',
  'docs/DEPLOYMENT_PRODUCTION.md'
];
const errors = [];
for (const item of mustExist) {
  if (!fs.existsSync(path.join(root, item))) errors.push(`Missing required file: ${item}`);
}
const schema = fs.readFileSync(path.join(root, 'database/schema.sql'), 'utf8');
for (const table of ['users','categories','products','product_images','product_media_links','product_reviews','favorites','orders','order_items','custom_orders','contact_messages','editable_pages','editable_content_blocks','site_settings','banners','admin_audit_logs','site_reviews','category_reviews']) {
  if (!new RegExp(`CREATE TABLE\\s+${table}\\b`, 'i').test(schema)) errors.push(`Missing table in schema: ${table}`);
}
const server = fs.readFileSync(path.join(root, 'backend/server.js'), 'utf8');
for (const token of ['helmet','cors','rateLimit','/api/health']) {
  if (!server.includes(token)) errors.push(`Backend server missing expected security/health feature: ${token}`);
}
const forbidden = [/JWT_SECRET\s*=\s*['"][^'"]+['"]/, /password\s*[:=]\s*['"]admin/i, /obaydoghassan@gmail.com\s*['"]/];
const scanFiles = [];
function walk(dir){ for(const name of fs.readdirSync(dir)){ const p=path.join(dir,name); const st=fs.statSync(p); if(st.isDirectory() && !['node_modules','.git','dist','uploads'].includes(name)) walk(p); else if(st.isFile() && /\.(js|jsx|sql|env|md)$/.test(name)) scanFiles.push(p); }}
walk(root);
for(const file of scanFiles){ const txt=fs.readFileSync(file,'utf8'); for(const re of forbidden){ if(re.test(txt) && !file.endsWith('.env.example')) errors.push(`Possible hardcoded secret/admin credential in ${path.relative(root,file)}`); }}
if(errors.length){ console.error('Rare Oud validation failed:\n- ' + errors.join('\n- ')); process.exit(1); }
console.log('Rare Oud validation passed: structure, schema, security markers, and secret scan look good.');
