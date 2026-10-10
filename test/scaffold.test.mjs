import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import http from 'node:http';
import { resolve } from 'node:path';
import { checkPublic, project } from '../scripts/check.mjs';
import { createStaticServer, CSP } from '../scripts/serve.mjs';

test('T00 package, real static check, initial HTML', async () => {
  const pkg = JSON.parse(await readFile(resolve(project, 'package.json')));
  assert.equal(pkg.private, true);
  assert.equal(pkg.type, 'module');
  assert.equal(pkg.engines.node, '>=24');
  assert.deepEqual(Object.keys(pkg.scripts), ['dev', 'test', 'check', 'build']);
  assert.ok((await checkPublic()).includes('index.html'));
});
function request(port, path, method = 'GET') {
  return new Promise((resolveRequest, reject) => {
    const req = http.request({ host: '127.0.0.1', port, path, method }, res => {
      let body = ''; res.on('data', chunk => { body += chunk; });
      res.on('end', () => resolveRequest({ status: res.statusCode, headers: res.headers, body }));
    }); req.on('error', reject); req.end();
  });
}
test('T00 loopback, MIME, methods, public-only paths and traversal', async t => {
  const server = await createStaticServer();
  await new Promise(resolveServer => server.listen(0, '127.0.0.1', resolveServer));
  t.after(() => new Promise(resolveClose => server.close(resolveClose)));
  assert.equal(server.address().address, '127.0.0.1');
  const port = server.address().port;
  const page = await request(port, '/');
  assert.equal(page.status, 200); assert.match(page.body, /noindex, nofollow/u);
  assert.equal(page.headers['content-security-policy'], CSP);
  assert.equal(page.headers['x-content-type-options'], 'nosniff');
  assert.equal(page.headers['x-frame-options'], 'DENY');
  assert.equal(page.headers['x-robots-tag'], 'noindex, nofollow');
  assert.equal((await request(port, '/js/app.mjs')).headers['content-type'], 'text/javascript; charset=utf-8');
  assert.equal((await request(port, '/', 'HEAD')).body, '');
  assert.equal((await request(port, '/', 'POST')).status, 405);
  for (const path of ['/../package.json', '/%2e%2e/package.json', '/.git/config', '/%252e%252e/package.json']) assert.equal((await request(port, path)).status, 403);
  for (const path of ['/package.json', '/docs/RESEARCH.md', '/unknown']) assert.equal((await request(port, path)).status, 404);
  const missing = await request(port, '/missing/nested/page');assert.equal(missing.status,404);assert.match(missing.body,/Page not found/u);assert.match(missing.body,/href="\/index.html"/u);
  for (const path of ['/%', '/%00', '/%5c..%5cpackage.json']) assert.equal((await request(port, path)).status, 400);
});
