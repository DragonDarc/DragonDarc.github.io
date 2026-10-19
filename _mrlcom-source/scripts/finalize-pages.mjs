import { readFile, writeFile } from 'node:fs/promises';
import { readPublicData } from './public-data.mjs';

// Validate and include school announcements even in a build without a network sync.
await writeFile('dist/data/activities.json', JSON.stringify(await readPublicData()) + '\n');

const raw = process.env.SITE_URL;
let siteURL;
if (raw) {
  const candidate = new URL(raw);
  if (candidate.protocol !== 'https:' || candidate.username || candidate.password) throw new Error('SITE_URL must be a public HTTPS URL');
  candidate.search = ''; candidate.hash = '';
  if (!candidate.pathname.endsWith('/')) candidate.pathname += '/';
  siteURL = candidate.href;
}
const escape = value => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
let html = await readFile('dist/index.html', 'utf8');
if (siteURL) {
  const image = new URL('images/mrlcom-students-scifi.webp', siteURL).href;
  const metadata = [
    `<link rel="canonical" href="${escape(siteURL)}" />`,
    `<meta property="og:url" content="${escape(siteURL)}" />`,
    `<meta property="og:image" content="${escape(image)}" />`,
    `<meta name="twitter:image" content="${escape(image)}" />`,
    `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'WebSite', name: 'MRLCOM โรงเรียนมาเรียลัย', url: siteURL, inLanguage: 'th' }).replaceAll('<', '\\u003c')}</script>`,
  ].join('\n');
  html = html.replace('</head>', `${metadata}\n</head>`);
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${escape(siteURL)}</loc><lastmod>${new Date().toISOString().slice(0, 10)}</lastmod></url></urlset>\n`;
  await writeFile('dist/sitemap.xml', sitemap);
}
await writeFile('dist/index.html', html);
await writeFile('dist/404.html', html);
await writeFile('dist/.nojekyll', '');
await writeFile('dist/robots.txt', `User-agent: *\nAllow: /\n${siteURL ? `Sitemap: ${new URL('sitemap.xml', siteURL).href}\n` : ''}`);
console.log('GitHub Pages assets ready' + (siteURL ? `: ${siteURL}` : ''));
