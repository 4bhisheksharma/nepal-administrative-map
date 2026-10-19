import { Devanagari } from '../i18n/devanagari.js';
import type { AdminLevel, AdminLevelId, Region } from '../models/region.js';
import {
  districts,
  localLevels,
  provinces,
  regionAliases,
} from './regions.generated.js';

type LevelFilter = AdminLevel | AdminLevelId;

function levelId(level: LevelFilter): AdminLevelId {
  return typeof level === 'string' ? level : level.id;
}

/** Searches region names in English (with aliases) and Nepali. */
export class RegionSearch {
  private constructor(private readonly entries: Entry[]) {}

  private static _instance: RegionSearch | undefined;

  static get instance(): RegionSearch {
    if (!RegionSearch._instance) {
      RegionSearch._instance = new RegionSearch(
        [...provinces, ...districts, ...localLevels].map((r) => new Entry(r)),
      );
    }
    return RegionSearch._instance;
  }

  search(
    query: string,
    options: { levels?: Set<LevelFilter>; limit?: number } = {},
  ): Region[] {
    const limit = options.limit ?? 10;
    const nepali = Devanagari.contains(query);
    const q = nepali ? Devanagari.normalize(query) : latin(query);
    if (!q || limit <= 0) return [];

    const levelIds = options.levels
      ? new Set([...options.levels].map(levelId))
      : null;

    const scored: { score: number; entry: Entry }[] = [];
    for (const entry of this.entries) {
      if (levelIds && !levelIds.has(entry.region.level.id)) continue;
      let best = 0;
      for (const key of nepali ? entry.ne : entry.en) {
        best = Math.max(best, score(key, q));
        if (best === EXACT) break;
      }
      if (best > 0) scored.push({ score: best, entry });
    }

    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const byLevel =
        levelOrder(a.entry.region.level.id) - levelOrder(b.entry.region.level.id);
      if (byLevel !== 0) return byLevel;
      return a.entry.region.name.en.length - b.entry.region.name.en.length;
    });

    return scored.slice(0, limit).map((s) => s.entry.region);
  }
}

const EXACT = 100;

function levelOrder(id: AdminLevelId): number {
  return id === 'province' ? 0 : id === 'district' ? 1 : 2;
}

function score(key: string, q: string): number {
  if (key === q) return EXACT;
  if (key.startsWith(q)) return 80;
  if (key.includes(` ${q}`)) return 60;
  if (key.includes(q)) return 40;
  if (q.length < 4) return 0;
  let distance = osa(q, key.length > q.length ? key.slice(0, q.length) : key);
  for (const word of key.split(' ')) {
    if (distance <= 1) break;
    distance = Math.min(distance, osa(q, word));
  }
  return distance <= 2 ? 20 - distance * 5 : 0;
}

function osa(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 2) return 3;
  const rows = Array.from({ length: a.length + 1 }, () =>
    Array<number>(b.length + 1).fill(0),
  );
  for (let i = 0; i <= a.length; i++) rows[i]![0] = i;
  for (let j = 0; j <= b.length; j++) rows[0]![j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      let d = Math.min(
        rows[i - 1]![j]! + 1,
        rows[i]![j - 1]! + 1,
        rows[i - 1]![j - 1]! + cost,
      );
      if (
        i > 1 &&
        j > 1 &&
        a.charCodeAt(i - 1) === b.charCodeAt(j - 2) &&
        a.charCodeAt(i - 2) === b.charCodeAt(j - 1)
      ) {
        d = Math.min(d, rows[i - 2]![j - 2]! + 1);
      }
      rows[i]![j] = d;
    }
  }
  return rows[a.length]![b.length]!;
}

const NON_ALNUM = /[^a-z0-9]+/g;

function latin(s: string): string {
  return s.toLowerCase().replace(NON_ALNUM, ' ').trim();
}

class Entry {
  readonly en: string[];
  readonly ne: string[];

  constructor(readonly region: Region) {
    this.en = [
      ...new Set([
        latin(region.name.en),
        latin(region.fullName('en')),
        ...(regionAliases[region.code] ?? []).map(latin),
      ]),
    ];
    this.ne =
      region.name.ne === region.name.en
        ? []
        : [
            ...new Set([
              Devanagari.normalize(region.name.ne),
              Devanagari.normalize(region.fullName('ne')),
            ]),
          ];
  }
}
