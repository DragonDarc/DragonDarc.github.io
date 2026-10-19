import type { Activity, AppData, SourceState } from './radar-types';

export const SAVED_KEY = 'mrlcom:saved:v1';

export function parseSaved(raw: string | null): string[] {
  try {
    const value: unknown = JSON.parse(raw ?? '[]');
    return Array.isArray(value) ? [...new Set(value.filter((id): id is string => typeof id === 'string' && id.length < 200))] : [];
  } catch { return []; }
}

export function readSaved(): string[] {
  try { return parseSaved(localStorage.getItem(SAVED_KEY)); }
  catch { return []; }
}

export function writeSaved(ids: string[]): void {
  localStorage.setItem(SAVED_KEY, JSON.stringify([...new Set(ids)]));
}

type PublishedData = { activities: Activity[]; sources: SourceState[]; lastSync: string | null; scheduleEnabled?: boolean };
export async function loadPublishedData(): Promise<AppData> {
  const response = await fetch(`${import.meta.env.BASE_URL}data/activities.json`, { cache: 'no-cache' });
  if (!response.ok) throw new Error('โหลดข้อมูลล่าสุดไม่ได้');
  const data = await response.json() as PublishedData;
  if (!Array.isArray(data.activities) || !Array.isArray(data.sources)) throw new Error('รูปแบบข้อมูลไม่ถูกต้อง');
  return { ...data, saved: readSaved(), nextSync: null, scheduleEnabled: data.scheduleEnabled === true };
}
