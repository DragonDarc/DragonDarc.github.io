import type { Activity } from './radar-types';

export function mergeActivity(old: Activity | undefined, incoming: Activity, detailsRead: boolean): Activity {
  if (!old) return incoming;
  if (old.custom) return old;
  if (old.reviewed) return { ...old, fetchedAt: incoming.fetchedAt };
  const next = { ...incoming, id: old.id };
  next.deadline ??= old.deadline;
  next.levels = next.levels.length ? next.levels : old.levels;
  next.detailsCheckedAt ??= old.detailsCheckedAt;
  next.officialURL ??= old.officialURL;
  if (!detailsRead && old.detailsCheckedAt) {
    next.summary = old.summary;
    next.organizer = old.organizer;
    next.fee = old.fee;
    next.feeNote = old.feeNote;
    next.team = old.team;
    next.location = old.location;
    next.area = old.area;
  }
  return next;
}
