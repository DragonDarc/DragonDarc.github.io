import { writeFile, rename } from 'node:fs/promises';
import { sourceDefinitions, sourceState, allowedSourceURL } from '../lib/radar-sources.ts';
import { readSource, articleText } from '../lib/radar-source-reader.ts';
import { canonicalURL, feedToActivity, extractDeadline } from '../lib/radar-parser.ts';
import { mergeActivity } from '../lib/pages-merge.ts';
import { readPublicData, validateActivities } from './public-data.mjs';

const data = await readPublicData();
const now = new Date().toISOString();
const activities = new Map(data.activities.map(a => [canonicalURL(a.url), a]));
const selected = process.argv.slice(2);
const definitions = selected.length ? sourceDefinitions.filter(s => selected.includes(s.id)) : sourceDefinitions;
if (!definitions.length) throw new Error('No matching source');

async function fetchPublic(url, hops = 0) {
  if (!allowedSourceURL(url)) throw new Error('แหล่งข้อมูลไม่อยู่ในรายการที่อนุญาต');
  const response = await fetch(url, {
    redirect: 'manual',
    signal: AbortSignal.timeout(20000),
    headers: { Accept: 'application/rss+xml, application/xml, text/html;q=0.9,*/*;q=0.8', 'User-Agent': 'MRLCOM-SchoolHub/1.0 (public educational activity reader)' },
  });
  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get('location');
    if (!location || hops >= 3) throw new Error('ต้นทางเปลี่ยนเส้นทางเกินที่รองรับ');
    return fetchPublic(new URL(location, url).href, hops + 1);
  }
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const reader = response.body?.getReader();
  if (!reader) throw new Error('ต้นทางไม่มีข้อมูล');
  const decoder = new TextDecoder(); let bytes = 0; let text = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 2500000) throw new Error('ข้อมูลเกินขนาดที่รองรับ');
      text += decoder.decode(value, { stream: true });
    }
    return text + decoder.decode();
  } finally { await reader.cancel(); }
}

const states = await Promise.all(definitions.map(async source => {
  const state = sourceState(source, data.sources.find(s => s.id === source.id));
  state.lastAttempt = now; state.scanned = 0; state.imported = 0;
  const known = [...activities.values()].filter(a => a.source === source.id);
  // Preserve the crawl delay already used by the school reader for Contest War.
  let chain = Promise.resolve(); let lastRead = 0;
  const fetchPage = source.id !== 'contestwar' ? fetchPublic : url => {
    const request = chain.then(async () => {
      const delay = 10000 - (Date.now() - lastRead);
      if (delay > 0) await new Promise(resolve => setTimeout(resolve, delay));
      lastRead = Date.now();
      return fetchPublic(url);
    });
    chain = request.catch(() => {}); return request;
  };
  try {
    if (source.reader === 'announcement') {
      const raw = await fetchPage(source.url);
      const deadline = extractDeadline(articleText(raw));
      for (const old of known) {
        if (old.custom) continue;
        const changed = deadline && deadline !== old.deadline;
        activities.set(canonicalURL(old.url), { ...old, fetchedAt: now, ...(changed ? { deadline, reviewed: false, needsReview: true } : {}) });
      }
      state.scanned = 1; state.message = 'อ่านประกาศต้นทางสำเร็จ';
    } else {
      const detailsChecked = new Map(known.map(a => [canonicalURL(a.url), a.detailsCheckedAt ?? null]));
      const result = await readSource(source, fetchPage, { detailsChecked });
      state.scanned = result.scanned;
      for (const item of result.items) {
        if (!allowedSourceURL(item.url)) continue;
        const incoming = feedToActivity(item, source.id, now);
        if (!incoming) continue;
        if (!incoming.deadline && incoming.publishedAt && Date.parse(incoming.publishedAt) < Date.now() - 180 * 86400000) continue;
        const url = canonicalURL(item.url);
        const old = activities.get(url);
        activities.set(url, mergeActivity(old, incoming, item.detailsRead === true));
        state.imported++;
      }
      if (source.id === 'contestwar') {
        const dates = result.items.map(item => Date.parse(item.publishedAt)).filter(Number.isFinite);
        if (dates.length) state.latestPublishedAt = new Date(Math.max(...dates)).toISOString();
      }
      state.message = `อ่าน ${state.scanned} ข่าว · นำเข้า/อัปเดต ${state.imported} รายการ`;
      if (result.warnings.length) state.message += ' · ' + result.warnings.join(' · ');
    }
    state.status = 'success'; state.lastSuccess = now;
  } catch (error) {
    state.status = 'error';
    state.message = `อ่านต้นทางไม่สำเร็จ (${error instanceof Error ? error.message : 'เชื่อมต่อไม่ได้'}) · เก็บข้อมูลเดิมและลองใหม่ในรอบถัดไป`;
  }
  console.log(`${source.id}: ${state.status} (${state.imported} activities)`);
  return state;
}));

const next = {
  activities: validateActivities([...activities.values()]),
  sources: sourceDefinitions.map(source => states.find(s => s.id === source.id) ?? sourceState(source, data.sources.find(s => s.id === source.id))),
  lastSync: now,
  scheduleEnabled: process.env.GITHUB_ACTIONS === 'true' || data.scheduleEnabled,
};
const path = 'public/data/activities.json';
await writeFile(`${path}.tmp`, JSON.stringify(next, null, 2) + '\n');
await rename(`${path}.tmp`, path);
console.log(`Saved ${next.activities.length} public activities; ${states.filter(s => s.status === 'success').length}/${states.length} sources readable.`);
