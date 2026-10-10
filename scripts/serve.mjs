import http from 'node:http';
import { readFile, realpath, stat, lstat } from 'node:fs/promises';
import { dirname, resolve, relative, isAbsolute, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const project = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const CSP = "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";
export const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml; charset=utf-8', '.svg': 'image/svg+xml' };
function contained(root, path) { const rel = relative(root, path); return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel)); }

export async function createStaticServer({ directory = 'public' } = {}) {
  if (!['public', 'dist'].includes(directory)) throw new Error('INVALID_ROOT');
  const candidateRoot = resolve(project, directory);
  const root = await realpath(candidateRoot);
  if ((await lstat(candidateRoot)).isSymbolicLink() || root !== candidateRoot) throw new Error('INVALID_ROOT');
  if (!contained(project, root)) throw new Error('INVALID_ROOT');
  return http.createServer(async (req, res) => {
    const headers = { 'Content-Security-Policy': CSP, 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'Permissions-Policy': 'camera=(), microphone=(), geolocation=()', 'X-Frame-Options': 'DENY', 'X-Robots-Tag': 'noindex, nofollow', 'Cache-Control': 'no-store' };
    function reply(code, body = '', type = 'text/plain; charset=utf-8') {
      res.writeHead(code, { ...headers, 'Content-Type': type });
      res.end(req.method === 'HEAD' ? undefined : body);
    }
    async function notFound() {
      try { reply(404, await readFile(resolve(root, '404.html')), mime['.html']); }
      catch { reply(404, 'Not found'); }
    }
    if (!['GET', 'HEAD'].includes(req.method)) { res.setHeader('Allow', 'GET, HEAD'); reply(405, 'Method not allowed'); return; }
    let path;
    try { path = decodeURIComponent((req.url || '').split('?')[0]); } catch { reply(400, 'Invalid path'); return; }
    if (!path.startsWith('/') || /[\x00-\x1f\\:]/u.test(path)) { reply(400, 'Invalid path'); return; }
    if (path.split('/').some(part => part.startsWith('.')) || path.includes('%')) { reply(403, 'Forbidden'); return; }
    if (path.endsWith('/')) path += 'index.html';
    const target = resolve(root, '.' + path);
    if (!contained(root, target)) { reply(403, 'Forbidden'); return; }
    const type = mime[extname(target)];
    if (!type || path === '/_headers') { await notFound(); return; }
    try {
      const actual = await realpath(target);
      if (!contained(root, actual)) { reply(403, 'Forbidden'); return; }
      if (!(await stat(actual)).isFile()) { await notFound(); return; }
      reply(200, await readFile(actual), type);
    } catch { await notFound(); }
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const portArg = process.argv.find(arg => arg.startsWith('--port='));
  const directory = process.argv.includes('--dist') ? 'dist' : 'public';
  const port = portArg ? Number(portArg.slice(7)) : 4188;
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('INVALID_PORT');
  const server = await createStaticServer({ directory });
  server.on('error', () => { console.error('SERVER_START_FAILED'); process.exitCode = 1; });
  server.listen(port, '127.0.0.1', () => console.log(`Preview: http://127.0.0.1:${server.address().port}/ (${directory})`));
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close());
}
