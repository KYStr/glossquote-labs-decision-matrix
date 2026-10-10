import { readdir, readFile, lstat, realpath } from 'node:fs/promises';
import { dirname, resolve, relative, isAbsolute, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

export const project = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export async function listFiles(root, prefix = '') {
  const entries = await readdir(resolve(root, prefix), { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isSymbolicLink()) throw new Error('SYMLINK_REJECTED');
    if (entry.isDirectory()) files.push(...await listFiles(root, path));
    else if (entry.isFile()) files.push(path);
    else throw new Error('INVALID_FILE');
  }
  return files.sort();
}
export async function checkPublic() {
  const root = resolve(project, 'public');
  if ((await lstat(root)).isSymbolicLink() || (await realpath(root)) !== root) throw new Error('UNSAFE_PUBLIC_ROOT');
  const files = await listFiles(root);
  for (const required of ['index.html', 'styles/tokens.css', 'styles/app.css', 'js/app.mjs']) if (!files.includes(required)) throw new Error(`MISSING_FILE: ${required}`);
  const packageData = JSON.parse(await readFile(resolve(project, 'package.json'), 'utf8'));
  if (packageData.private !== true || packageData.type !== 'module' || packageData.engines.node !== '>=24' || packageData.dependencies || packageData.devDependencies) throw new Error('INVALID_PACKAGE');
  for (const name of files) {
    if (!(['index.html','en/index.html','404.html','_headers','js/i18n.mjs'].includes(name) || /^styles\/[a-z-]+\.css$/u.test(name) || /^js\/(?:core\/)?[a-z-]+\.mjs$/u.test(name))) throw new Error(`INVALID_PUBLIC_FILE: ${name}`);
    const content = await readFile(resolve(root, name), 'utf8');
    const extension = extname(name);
    if (extension === '.mjs' || extension === '.js') {
      const result = spawnSync(process.execPath, ['--check', resolve(root, name)], { shell: false, encoding: 'utf8' });
      if (result.status !== 0) throw new Error(`SYNTAX: ${name}`);
      if (/\b(?:eval|fetch)\s*\(|\bnew\s+Function\b|\b(?:XMLHttpRequest|WebSocket|sendBeacon|localStorage|sessionStorage|indexedDB|serviceWorker)\b|\.(?:innerHTML|outerHTML)\b|\binsertAdjacentHTML\b|\bconsole\./u.test(content)) throw new Error(`FORBIDDEN_API: ${name}`);
    }
    const refs = [];
    if (extension === '.html') {
      if (!/<html\b[^>]*\blang=/u.test(content) || !/<h1\b/u.test(content) || !/<meta name="robots" content="noindex, nofollow"/u.test(content)) throw new Error(`HTML_BASELINE: ${name}`);
      if (/<script\b(?![^>]*\bsrc=)|\son[a-z]+\s*=|\sstyle\s*=/iu.test(content)) throw new Error(`INLINE_EXECUTION: ${name}`);
      for (const m of content.matchAll(/(?:src|href)="([^"]+)"/gu)) { if (!m[1].startsWith('#') && !['https://glossquote.com/index.html','https://glossquote.com/en/index.html'].includes(m[1])) refs.push(m[1]); }
    }
    if (extension === '.css') for (const m of content.matchAll(/(?:url\(["']?([^\s)'";]+)|@import\s+["']([^"']+))/gu)) refs.push(m[1] || m[2]);
    if (extension === '.mjs' || extension === '.js') for (const m of content.matchAll(/(?:from\s+|import\s*)['"]([^'"]+)['"]/gu)) refs.push(m[1]);
    for (const ref of refs) {
      if (/^(?:[a-z]+:|\/\/)/iu.test(ref)) throw new Error(`EXTERNAL_RESOURCE: ${name}`);
      const target = ref.startsWith('/') ? resolve(root, '.'+ref) : resolve(dirname(resolve(root, name)), ref);
      const rel = relative(root, target);
      if (rel.startsWith('..') || isAbsolute(rel)) throw new Error(`RESOURCE_ESCAPE: ${name}`);
      if (!(await lstat(target)).isFile() || (await realpath(target)) !== target) throw new Error(`INVALID_RESOURCE: ${name}`);
    }
  }
  return files;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await checkPublic();
  for (const name of await listFiles(resolve(project, 'scripts'))) if (name.endsWith('.mjs')) {
    if (spawnSync(process.execPath, ['--check', resolve(project, 'scripts', name)], { shell: false }).status !== 0) throw new Error(`SCRIPT_SYNTAX: ${name}`);
  }
  console.log('PASS: syntax, public allowlist, local references, no runtime dependencies or forbidden APIs. Manual browser checks are separate.');
}
