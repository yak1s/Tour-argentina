/**
 * A tiny static server that mimics GitHub Pages for a project site: the
 * build is served under /<repo>/ (default /Tour-argentina/), unknown paths
 * return 404, and responses carry a short max-age like Pages does.
 *
 * Usage: node tests/e2e/serve.mjs [port] [basePath]
 */
import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('../../dist', import.meta.url)));
const port = Number(process.argv[2] || process.env.PORT || 4174);
const base = (process.argv[3] || process.env.BASE_PATH || '/Tour-argentina/').replace(/\/?$/, '/');

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.mp3': 'audio/mpeg',
  '.txt': 'text/plain; charset=utf-8',
};

const server = createServer((req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${port}`);
  let path = decodeURIComponent(url.pathname);
  if (path === base.slice(0, -1)) {
    res.writeHead(301, { Location: base });
    res.end();
    return;
  }
  if (!path.startsWith(base)) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404: not under ' + base);
    return;
  }
  path = path.slice(base.length);
  let file = normalize(join(root, path));
  if (!file.startsWith(root)) {
    res.writeHead(403);
    res.end();
    return;
  }
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
  if (!existsSync(file)) {
    res.writeHead(404, { 'Content-Type': 'text/html' });
    res.end('<h1>404</h1>');
    return;
  }
  const type = TYPES[extname(file)] ?? 'application/octet-stream';
  const size = statSync(file).size;
  const headers = { 'Content-Type': type, 'Cache-Control': 'max-age=600', 'Accept-Ranges': 'bytes' };
  const range = req.headers.range?.match(/bytes=(\d*)-(\d*)/);
  if (range) {
    const start = range[1] ? Number(range[1]) : 0;
    const end = range[2] ? Number(range[2]) : size - 1;
    res.writeHead(206, { ...headers, 'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': end - start + 1 });
    createReadStream(file, { start, end }).pipe(res);
    return;
  }
  res.writeHead(200, { ...headers, 'Content-Length': size });
  if (req.method === 'HEAD') res.end();
  else createReadStream(file).pipe(res);
});

server.listen(port, () => {
  console.log(`Serving ${root} at http://localhost:${port}${base}`);
});
