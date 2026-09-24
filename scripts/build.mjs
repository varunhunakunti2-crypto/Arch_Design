// NORDIC production build.
//
// Assembles a deployable build into ./dist:
//   1. Copies only production files (pages, assets, css, js).
//   2. Stamps the production base URL (single source: site.config.json) into
//      canonical/OG/Twitter/JSON-LD URLs.
//   3. Generates robots.txt and sitemap.xml from site.config.json routes.
//   4. Injects the CONTACT_ENDPOINT env var into js/config.js when set.
//   5. Prunes assets that no production page references.
//   6. Verifies every page: titles, canonicals, h1, favicon, local references,
//      JSON-LD and absence of development-only URLs.
//
// Fails (exit 1) on any verification error.

import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(SRC, 'dist');
const DEFAULT_BASE = 'https://www.nordicstudio.com';

// Tolerate a UTF-8 BOM (some Windows editors add one).
const config = JSON.parse(readFileSync(path.join(SRC, 'site.config.json'), 'utf8').replace(/^\uFEFF/, ''));
const baseUrl = (config.baseUrl || DEFAULT_BASE).replace(/\/$/, '');

const errors = [];
const ok = (msg) => console.log(`  ok    ${msg}`);
const fail = (msg) => errors.push(msg);

// ---------------------------------------------------------------------------
// 1. Clean and assemble dist
// ---------------------------------------------------------------------------
rmSync(DIST, { recursive: true, force: true });
mkdirSync(DIST, { recursive: true });

const pageDirs = ['about', 'services', 'projects', 'offices', 'contact'];
const rootFiles = ['index.html', '404.html', '500.html'];

for (const dir of pageDirs) {
  cpSync(path.join(SRC, dir), path.join(DIST, dir), { recursive: true });
}
for (const file of rootFiles) {
  if (!existsSync(path.join(SRC, file))) fail(`missing source file: ${file}`);
  cpSync(path.join(SRC, file), path.join(DIST, file));
  if (file === '500.html' && existsSync(path.join(SRC, '404.html'))) {
    ok(`included ${file}`);
  }
}
for (const dir of ['assets', 'css', 'js']) {
  cpSync(path.join(SRC, dir), path.join(DIST, dir), { recursive: true });
}

// ---------------------------------------------------------------------------
// 2. Stamp base URL into copied HTML
// ---------------------------------------------------------------------------
const stampHtml = (filePath) => {
  const abs = path.join(DIST, filePath);
  if (!existsSync(abs)) return;
  const html = readFileSync(abs, 'utf8');
  // Error pages carry no absolute URLs, so there is nothing to stamp.
  if (!html.includes(DEFAULT_BASE)) return;
  const stamped = html.split(DEFAULT_BASE).join(baseUrl);
  if (stamped !== html) writeFileSync(abs, stamped, 'utf8');
};

const htmlFiles = [];
const walk = (dir) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(abs);
    else if (entry.name.endsWith('.html')) htmlFiles.push(path.relative(DIST, abs));
  }
};
walk(DIST);
for (const f of htmlFiles) stampHtml(f);

// ---------------------------------------------------------------------------
// 3. robots.txt + sitemap.xml
// ---------------------------------------------------------------------------
const today = new Date().toISOString().slice(0, 10);

writeFileSync(
  path.join(DIST, 'robots.txt'),
  `User-agent: *
Allow: /

Sitemap: ${baseUrl}/sitemap.xml
`
);

const urls = config.routes.map(
  (r) => `  <url>
    <loc>${baseUrl}${r.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${r.changefreq || 'monthly'}</changefreq>
    <priority>${r.priority ?? 0.5}</priority>
  </url>`
);
writeFileSync(
  path.join(DIST, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>
`
);
ok(`sitemap.xml with ${config.routes.length} public routes -> ${baseUrl}`);

// ---------------------------------------------------------------------------
// 4. Inject CONTACT_ENDPOINT into js/config.js (when provided)
// ---------------------------------------------------------------------------
const contactEndpoint = process.env.CONTACT_ENDPOINT ? process.env.CONTACT_ENDPOINT.trim() : '';
const configJs = path.join(DIST, 'js', 'config.js');
if (contactEndpoint) {
  const js = readFileSync(configJs, 'utf8');
  writeFileSync(
    configJs,
    js.replace("contactEndpoint: ''", `contactEndpoint: ${JSON.stringify(contactEndpoint)}`),
    'utf8'
  );
  ok(`CONTACT_ENDPOINT injected into js/config.js`);
} else {
  ok('no CONTACT_ENDPOINT set — form keeps non-faking development behaviour');
}

// ---------------------------------------------------------------------------
// 5. Collect referenced assets and prune unreferenced files
// ---------------------------------------------------------------------------
const referenced = new Set();
const recordRef = (raw, fromFile) => {
  if (!raw || typeof raw !== 'string') return;
  const clean = raw.trim().split('#')[0];
  if (!clean) return;
  if (clean.startsWith('mailto:') || clean.startsWith('tel:') || clean.startsWith('data:')) return;
  let rel;
  if (clean.startsWith(baseUrl)) rel = clean.slice(baseUrl.length);
  else if (clean.startsWith(DEFAULT_BASE)) rel = clean.slice(DEFAULT_BASE.length);
  else if (/^(https?:)?\/\//.test(clean)) return; // external origin
  else if (clean.startsWith('/')) rel = clean; // root-relative
  else rel = path.posix.join(path.dirname(fromFile.replace(/\\/g, '/')), clean);
  if (rel.startsWith('..')) return;
  rel = rel.replace(/^\.?\//, '');
  if (!rel.startsWith('assets/')) return;
  referenced.add(rel);
};

for (const f of htmlFiles) {
  const abs = path.join(DIST, f);
  const html = readFileSync(abs, 'utf8');

  // srcset attributes contain "url 640w, url 1280w" candidates.
  const srcsetRe = /(?:srcset|imagesrcset)=["']([^"']+)["']/g;
  let m;
  while ((m = srcsetRe.exec(html))) {
    for (const candidate of m[1].split(',')) {
      const first = candidate.trim().split(/\s+/)[0];
      if (first) recordRef(first, f);
    }
  }
  const attrRe = /(?:href|src|poster)=["']([^"']+)["']/g;
  while ((m = attrRe.exec(html))) {
    if (!m[1].startsWith('srcset')) recordRef(m[1], f);
  }
  // og:image / twitter:image
  const contentRe = /<meta[^>]+(?:property|name)="(?:og:image|twitter:image)"[^>]*content="([^"]+)"/g;
  while ((m = contentRe.exec(html))) recordRef(m[1], f);
  // Any asset URL inside JSON-LD (image, logo, ...) — covers nested ImageObject.
  const ldAssetRe = /https?:[^\s"]*\/assets\/[^"\\\s]+/g;
  while ((m = ldAssetRe.exec(html))) recordRef(m[0], f);
}

const pruneAssets = (dir) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      pruneAssets(abs);
      if (readdirSync(abs).length === 0) rmSync(abs, { recursive: true, force: true });
    } else {
      const rel = path.relative(DIST, abs).replace(/\\/g, '/');
      if (!referenced.has(rel)) rmSync(abs, { force: true });
    }
  }
};
pruneAssets(path.join(DIST, 'assets'));
ok(`pruned unreferenced assets (${htmlFiles.length} pages referenced-only)`);

// ---------------------------------------------------------------------------
// 6. Verification
// ---------------------------------------------------------------------------
const localRefExists = (raw, fromFile) => {
  const clean = raw.trim().split('#')[0];
  if (!clean) return true;
  if (/^(https?:)?\/\//.test(clean) || clean.startsWith('mailto:') || clean.startsWith('tel:') || clean.startsWith('data:')) return true;
  if (clean.startsWith('#')) return true;
  let rel;
  if (clean.startsWith('/')) {
    if (clean.startsWith(baseUrl)) rel = clean.slice(baseUrl.length);
    else if (clean.startsWith(DEFAULT_BASE)) rel = clean.slice(DEFAULT_BASE.length);
    else rel = clean;
  } else {
    rel = path.posix.join(path.dirname(fromFile.replace(/\\/g, '/')), clean);
  }
  if (rel.startsWith('../') || rel.startsWith('..')) return false;
  return existsSync(path.join(DIST, rel.replace(/^\.?\//, '')));
};

const checkRefsIn = (html, fromFile) => {
  const attrRe = /(?:href|src|poster)=["']([^"']+)["']/g;
  let m;
  while ((m = attrRe.exec(html))) if (m[1].startsWith('srcset')) { /* handled below */ } else if (!localRefExists(m[1], fromFile)) fail(`${fromFile}: broken ref ${m[1]}`);
  const srcsetRe = /srcset=["']([^"']+)["']/g;
  while ((m = srcsetRe.exec(html))) {
    for (const candidate of m[1].split(',')) {
      const first = candidate.trim().split(/\s+/)[0];
      if (first && !localRefExists(first, fromFile)) fail(`${fromFile}: broken srcset ref ${first}`);
    }
  }
  // Social / structured-data images must resolve too.
  const contentRe = /<meta[^>]+(?:property|name)="(?:og:image|twitter:image)"[^>]*content="([^"]+)"/g;
  while ((m = contentRe.exec(html))) if (!localRefExists(m[1], fromFile)) fail(`${fromFile}: broken social image ${m[1]}`);
  const ldAssetRe = /https?:[^\s"]*\/assets\/[^"\\\s]+/g;
  while ((m = ldAssetRe.exec(html))) if (!localRefExists(m[0], fromFile)) fail(`${fromFile}: broken structured-data image ${m[0]}`);
};

for (const f of htmlFiles) {
  const abs = path.join(DIST, f);
  const html = readFileSync(abs, 'utf8');
  const isError = f === '404.html' || f === '500.html';
  const fposix = f.split(path.sep).join('/');
  const relDir = path.posix.dirname(fposix);
  const dir = relDir === '.' ? '' : relDir;
  const expected = baseUrl + '/' + dir + (dir ? '/' : '');

  checkRefsIn(html, f);

  if (!/<title>[^<]+<\/title>/.test(html)) fail(`${f}: missing <title>`);
  if (!/<meta name="description"/.test(html)) fail(`${f}: missing meta description`);
  const canonical = /<link rel="canonical" href="([^"]+)"/.exec(html);
  if (isError) {
    if (canonical) fail(`${f}: error page must not declare a canonical`);
    if (!/name="robots" content="[^"]*noindex/.test(html)) fail(`${f}: error page must be noindex`);
  } else {
    if (!canonical) fail(`${f}: missing canonical`);
    else if (canonical[1] !== expected) fail(`${f}: canonical ${canonical[1]} != ${expected}`);
    if (!/<meta property="og:title"/.test(html)) fail(`${f}: missing og:title`);
    if (!/<meta property="og:image"/.test(html)) fail(`${f}: missing og:image`);
    if (!/<meta name="twitter:card"/.test(html)) fail(`${f}: missing twitter:card`);
  }
  if (!/assets\/favicon\.svg/.test(html)) fail(`${f}: missing favicon.svg`);
  if (!/rel="apple-touch-icon"/.test(html) && !isError) fail(`${f}: missing apple-touch-icon`);
  if ((html.match(/<h1[\s>]/g) || []).length !== 1) fail(`${f}: expected exactly one h1`);
  if (/localhost|127\.0\.0\.1|file:\/\/|C:\\|C:\//.test(html)) fail(`${f}: development-only URL detected`);

  for (const block of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try {
      const data = JSON.parse(block[1]);
      const nodes = Array.isArray(data) ? data : Array.isArray(data['@graph']) ? data['@graph'] : [data];
      for (const n of nodes) {
        if (!n['@type']) fail(`${f}: JSON-LD node without @type`);
        if (n['@context'] && n['@context'] !== 'https://schema.org') fail(`${f}: non-schema.org @context`);
        const str = JSON.stringify(n);
        if (/[\u0000-\u001f\u007f]/.test(str)) fail(`${f}: JSON-LD contains control characters`);
      }
    } catch {
      fail(`${f}: invalid JSON-LD`);
    }
  }
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
if (errors.length) {
  console.error(`\nBUILD FAILED — ${errors.length} issue(s):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(`\nBuild complete -> ${DIST}`);
console.log(`  baseUrl: ${baseUrl}`);
console.log(`  pages:   ${htmlFiles.length}`);
