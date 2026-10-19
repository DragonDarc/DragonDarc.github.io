import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { readFile } from 'node:fs/promises';
import { validateActivities, readPublicData } from '../scripts/public-data.mjs';

registerHooks({ resolve(specifier, context, next) {
  try { return next(specifier, context); }
  catch (error) {
    if (error.code === 'ERR_MODULE_NOT_FOUND' && specifier.startsWith('.') && !/\.[a-z]+$/i.test(specifier)) return next(specifier + '.ts', context);
    throw error;
  }
} });
const { mergeActivity } = await import('../lib/pages-merge.ts');
const { parseSaved, readSaved, writeSaved, SAVED_KEY } = await import('../lib/pages-data.ts');
const snapshot = JSON.parse(await readFile(new URL('../public/data/activities.json', import.meta.url), 'utf8'));
const original = snapshot.activities[0];

test('bookmarks persist locally and recover from corrupt storage without a login', () => {
  const stored = new Map();
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: key => stored.get(key) ?? null,
    setItem: (key, value) => stored.set(key, value),
  } });
  try {
    writeSaved(['one', 'two', 'one']);
    assert.deepEqual(readSaved(), ['one', 'two']);
    stored.set(SAVED_KEY, 'broken-json');
    assert.deepEqual(readSaved(), []);
    assert.deepEqual(parseSaved('["one",7,null,"one"]'), ['one']);
  } finally {
    if (previous) Object.defineProperty(globalThis, 'localStorage', previous);
    else delete globalThis.localStorage;
  }
});

test('a short feed update preserves the full announcement, deadline and stable bookmark ID', () => {
  const old = { ...original, reviewed: false, detailsCheckedAt: '2026-10-18T10:00:00Z', deadline: '2026-11-20', levels: ['ม.4'], summary: 'Full source details', organizer: 'School', fee: 0, feeNote: 'Free', officialURL: 'https://example.org/' };
  const incoming = { ...old, id: 'new-id', summary: 'Short feed', deadline: null, levels: [], detailsCheckedAt: null, officialURL: null, organizer: 'Unknown', fee: null, feeNote: 'Unknown', fetchedAt: '2026-10-19T10:00:00Z' };
  const merged = mergeActivity(old, incoming, false);
  assert.equal(merged.id, old.id);
  assert.equal(merged.summary, old.summary);
  assert.equal(merged.deadline, old.deadline);
  assert.equal(merged.organizer, 'School');
  assert.equal(merged.fee, 0);
  assert.deepEqual(merged.levels, ['ม.4']);
  assert.equal(merged.officialURL, old.officialURL);
});

test('automated updates preserve teacher corrections and manual school announcements', () => {
  const old = { ...original, reviewed: true, title: 'Verified teacher title' };
  const incoming = { ...original, title: 'New automatic title', fetchedAt: '2026-10-19T10:00:00Z' };
  assert.equal(mergeActivity(old, incoming, true).title, old.title);
  assert.equal(mergeActivity(old, incoming, true).fetchedAt, incoming.fetchedAt);
  const custom = { ...old, custom: true };
  assert.deepEqual(mergeActivity(custom, incoming, true), custom);
});

test('the public export contains usable records and rejects unsafe links and duplicate IDs', async () => {
  const data = await readPublicData();
  assert.ok(data.activities.length >= 130);
  assert.ok(data.sources.length >= 10);
  assert.ok(!('saved' in data));
  assert.ok(!('authenticated' in data));
  assert.equal(validateActivities([{ ...original, summary: '' }]).length, 1);
  assert.throws(() => validateActivities([{ ...original, url: 'javascript:alert(1)' }]), /Invalid link/);
  assert.throws(() => validateActivities([original, original]), /duplicate activity ID/);
});
