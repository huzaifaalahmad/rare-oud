import { createReadStream, existsSync } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';

const root = resolve(process.cwd(), 'dist');
const port = Number(process.env.PORT || 5173);

const types = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json; charset=utf-8'
};

function resolveAsset(url) {
  const pathname = decodeURIComponent(new URL(url, `http://127.0.0.1:${port}`).pathname);
  if (pathname.endsWith('/')) return join(root, 'index.html');
  const requested = normalize(pathname).replace(/^(\.\.[/\\])+/, '');
  const candidate = resolve(root, requested.slice(1));
  if (candidate.startsWith(root) && existsSync(candidate)) return candidate;
  return join(root, 'index.html');
}

const server = createServer(async (req, res) => {
  try {
    const file = resolveAsset(req.url || '/');
    const info = await stat(file);
    if (!info.isFile()) {
      res.writeHead(404).end();
      return;
    }

    res.setHeader('Content-Type', types[extname(file)] || 'application/octet-stream');
    res.setHeader('Cache-Control', file.endsWith('index.html') ? 'no-store' : 'public, max-age=31536000, immutable');
    createReadStream(file).pipe(res);
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(error.message);
  }
});

server.listen(port, () => {
  process.stdout.write(`Rare Oud static test server listening on ${port}\n`);
});

function shutdown() {
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 1000).unref();
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
