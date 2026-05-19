const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const denyDirs = new Set(['node_modules','.git','dist','build','coverage']);
const patterns = [
  /JWT_(REFRESH_)?SECRET\s*=\s*[^\n#]{24,}/i,
  /ADMIN_PASSWORD\s*=\s*[^\n#]+/i,
  /DB_PASSWORD\s*=\s*[^\n#]{8,}/i,
  /AKIA[0-9A-Z]{16}/,
  /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/
];
let hits = [];
function walk(dir){
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (denyDirs.has(ent.name)) continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p);
    else if (ent.isFile()) {
      const rel = path.relative(root, p);
      if (/(^|[\\/])\.env($|\.)/.test(rel)) continue;
      if (/package-lock\.json$/.test(rel) || /\.env\.example$/.test(rel) || /\.env\.production\.example$/.test(rel) || /tests\//.test(rel) || rel === 'scripts/secret-scan.js') continue;
      const lines = fs.readFileSync(p, 'utf8').slice(0, 1024*1024).split(/\r?\n/).filter(l => !l.trim().startsWith('#'));
      if (lines.some(line => patterns.some(re => re.test(line)) && !/change|replace|example|random|process\.env|\$\{|<|\.\.\./i.test(line))) hits.push(rel);
    }
  }
}
walk(root);
if (hits.length) { console.error('Potential secrets found:\n' + hits.join('\n')); process.exit(1); }
console.log('Secret scan passed');
