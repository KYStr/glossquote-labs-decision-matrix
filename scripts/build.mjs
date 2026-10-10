import { cp, lstat, mkdir, rm, realpath, readFile, writeFile } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkPublic, listFiles, project } from './check.mjs';

export async function build({ production = false, origin } = {}) {
if (production && origin !== 'https://decide.glossquote.com') throw new Error('INVALID_PRODUCTION_ORIGIN');
if (!production && origin) throw new Error('PREVIEW_ORIGIN_REJECTED');
const files = await checkPublic();
const actualProject = await realpath(project);
const target = resolve(actualProject, 'dist');
if (relative(actualProject, target) !== 'dist') throw new Error('INVALID_BUILD_TARGET');
try { if ((await lstat(target)).isSymbolicLink() || (await realpath(target)) !== target) throw new Error('UNSAFE_BUILD_TARGET'); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
await rm(target, { recursive: true, force: true });
await mkdir(target);
for (const name of files) await cp(resolve(project, 'public', name), resolve(target, name), { recursive: false });
const extra = ['robots.txt'];
if (production) {
  const zh = `${origin}/index.html`, en = `${origin}/en/index.html`;
  const alternates = `  <link rel="alternate" hreflang="zh-Hant" href="${zh}">\n  <link rel="alternate" hreflang="en" href="${en}">\n  <link rel="alternate" hreflang="x-default" href="${zh}">`;
  for (const [name,canonical] of [['index.html',zh],['en/index.html',en]]) {
    const source = await readFile(resolve(target,name),'utf8');
    await writeFile(resolve(target,name),source.replace('<meta name="robots" content="noindex, nofollow">','<meta name="robots" content="index, follow">').replace('</head>',`  <link rel="canonical" href="${canonical}">\n${alternates}\n</head>`));
  }
  const alternateXML = `<xhtml:link rel="alternate" hreflang="zh-Hant" href="${zh}"/><xhtml:link rel="alternate" hreflang="en" href="${en}"/><xhtml:link rel="alternate" hreflang="x-default" href="${zh}"/>`;
  await writeFile(resolve(target,'sitemap.xml'),`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml"><url><loc>${zh}</loc>${alternateXML}</url><url><loc>${en}</loc>${alternateXML}</url></urlset>\n`);
  await writeFile(resolve(target,'robots.txt'),`User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`);
  extra.push('sitemap.xml');
} else {
  await writeFile(resolve(target,'robots.txt'),'User-agent: *\nDisallow: /\n');
  await writeFile(resolve(target,'_headers'),(await readFile(resolve(target,'_headers'),'utf8')).replace('/*\n','/*\n  X-Robots-Tag: noindex, nofollow\n'));
}
const expected = [...files,...extra].sort();
if (JSON.stringify(await listFiles(target)) !== JSON.stringify(expected)) throw new Error('BUILD_LIST_MISMATCH');
return { mode: production?'production-candidate':'preview', files: expected };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.some(arg=>arg!=='--production' && !arg.startsWith('--origin='))) throw new Error('UNKNOWN_BUILD_ARGUMENT');
  const result = await build({ production:args.includes('--production'),origin:args.find(a=>a.startsWith('--origin='))?.slice(9) });
  console.log(`PASS: ${result.mode} build (${result.files.length} static assets). This command does not deploy.`);
}
