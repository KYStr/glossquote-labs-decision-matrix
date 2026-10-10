import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { build } from '../scripts/build.mjs';
import { project } from '../scripts/check.mjs';
test('T06 preview fails closed; production canonical/hreflang/sitemap/robots/header allowlist',async()=>{
  const preview=await build();assert.equal(preview.mode,'preview');
  let html=await readFile(resolve(project,'dist/index.html'),'utf8');assert.match(html,/noindex, nofollow/u);assert.ok(!html.includes('rel="canonical"'));
  assert.equal(await readFile(resolve(project,'dist/robots.txt'),'utf8'),'User-agent: *\nDisallow: /\n');
  assert.match(await readFile(resolve(project,'dist/_headers'),'utf8'),/X-Robots-Tag: noindex, nofollow/u);
  await assert.rejects(build({production:true}),/INVALID_PRODUCTION_ORIGIN/u);
  await assert.rejects(build({production:true,origin:'https://unapproved.invalid'}),/INVALID_PRODUCTION_ORIGIN/u);
  const production=await build({production:true,origin:'https://decide.glossquote.com'});
  for(const path of ['index.html','en/index.html']){
    html=await readFile(resolve(project,'dist',path),'utf8');assert.match(html,/content="index, follow"/u);assert.ok(!html.includes('noindex'));
    assert.ok(html.includes(`rel="canonical" href="https://decide.glossquote.com/${path}"`));
    for(const [lang,p] of [['zh-Hant','index.html'],['en','en/index.html'],['x-default','index.html']])assert.ok(html.includes(`hreflang="${lang}" href="https://decide.glossquote.com/${p}"`));
  }
  const sitemap=await readFile(resolve(project,'dist/sitemap.xml'),'utf8');assert.equal((sitemap.match(/<loc>/gu)||[]).length,2);assert.equal((sitemap.match(/<xhtml:link/gu)||[]).length,6);
  assert.match(await readFile(resolve(project,'dist/robots.txt'),'utf8'),/Sitemap: https:\/\/decide.glossquote.com\/sitemap.xml/u);
  assert.ok(!production.files.some(f=>f.startsWith('docs/')||f.startsWith('test/')||f.includes('.runs')||f.endsWith('.json')));
  const headers=await readFile(resolve(project,'dist/_headers'),'utf8');for(const value of ['Content-Security-Policy:','frame-ancestors \'none\'','connect-src \'none\'','X-Content-Type-Options: nosniff','Referrer-Policy: no-referrer'])assert.ok(headers.includes(value));assert.ok(!headers.includes('X-Robots-Tag: noindex'));
  await build(); // Acceptance test leaves the default, unindexed preview in dist.
});
