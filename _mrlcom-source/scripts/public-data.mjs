import { readFile } from 'node:fs/promises';

export function validateActivities(items, { school = false } = {}) {
  if (!Array.isArray(items)) throw new Error('Activities must be an array');
  const ids = new Set();
  const categories = new Set(['science', 'computer', 'math', 'engineering', 'creative', 'language']);
  for (const item of items) {
    if (!item || typeof item !== 'object' || typeof item.id !== 'string' || !item.id || ids.has(item.id)) throw new Error('Missing or duplicate activity ID');
    if (school && (!item.id.startsWith('school-') || item.custom !== true)) throw new Error('School entries need a school- ID and custom: true');
    for (const key of ['title', 'organizer', 'source', 'feeNote', 'location', 'team', 'checkedAt']) {
      if (typeof item[key] !== 'string' || !item[key]) throw new Error(`Missing ${key}: ${item.id}`);
    }
    // Some public RSS listings have no excerpt. Never invent one during migration.
    if (typeof item.summary !== 'string' || (school && !item.summary)) throw new Error(`Missing summary: ${item.id}`);
    for (const key of ['url', 'officialURL']) {
      if (key === 'officialURL' && item[key] == null) continue;
      const u = new URL(item[key]);
      const legacy = u.protocol === 'http:' && ['contestwar.com', 'www.contestwar.com'].includes(u.hostname);
      if ((u.protocol !== 'https:' && !legacy) || u.username || u.password || u.port) throw new Error(`Invalid link: ${item.id}`);
    }
    if (!categories.has(item.category) || !['competition', 'camp', 'workshop'].includes(item.kind)) throw new Error(`Invalid category or kind: ${item.id}`);
    if (!['bangkok', 'other', 'online', 'unknown'].includes(item.area)) throw new Error(`Invalid area: ${item.id}`);
    for (const key of ['deadline', 'startDate', 'endDate']) {
      if (item[key] != null && (!/^\d{4}-\d{2}-\d{2}$/.test(item[key]) || !Number.isFinite(Date.parse(item[key])) || new Date(item[key]).toISOString().slice(0, 10) !== item[key])) throw new Error(`Invalid ${key}: ${item.id}`);
    }
    if (!Array.isArray(item.levels) || item.levels.some(x => typeof x !== 'string') || !Array.isArray(item.tags) || item.tags.some(x => typeof x !== 'string')) throw new Error(`Invalid levels or tags: ${item.id}`);
    if (item.fee !== null && (!Number.isFinite(item.fee) || item.fee < 0)) throw new Error(`Invalid fee: ${item.id}`);
    if (typeof item.reviewed !== 'boolean' || typeof item.needsReview !== 'boolean') throw new Error(`Missing review state: ${item.id}`);
    if (!Number.isFinite(Date.parse(item.checkedAt))) throw new Error(`Invalid checkedAt: ${item.id}`);
    ids.add(item.id);
  }
  return items;
}

export async function readPublicData() {
  const data = JSON.parse(await readFile('public/data/activities.json', 'utf8'));
  const school = validateActivities(JSON.parse(await readFile('public/data/school-activities.json', 'utf8')), { school: true });
  validateActivities(data.activities);
  if (!Array.isArray(data.sources) || !data.sources.length) throw new Error('Missing public sources');
  // The separate school file is authoritative: deleting an entry there removes it.
  const activities = new Map(data.activities.filter(a => !a.id.startsWith('school-')).map(a => [a.id, a]));
  for (const activity of school) activities.set(activity.id, activity);
  const { sources, lastSync, scheduleEnabled } = data;
  return { activities: [...activities.values()], sources, lastSync, scheduleEnabled: scheduleEnabled === true };
}
