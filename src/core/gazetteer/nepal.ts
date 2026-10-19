import type {
  AdminLevel,
  AdminLevelId,
  District,
  LocalLevel,
  ProtectedArea,
  Province,
  Region,
} from '../models/region.js';
import { AdminLevel as AL } from '../models/region.js';
import {
  districts,
  localLevels,
  protectedAreas,
  protectedAreasByCode,
  provinces,
  regionAliases,
  regionsByCode,
} from './regions.generated.js';
import { RegionSearch } from './search.js';

export {
  District,
  LocalLevel,
  ProtectedArea,
  Province,
  districts,
  localLevels,
  protectedAreas,
  provinces,
  regionAliases,
} from './catalog.js';

/** Entry point to Nepal's administrative regions. */
export const Nepal = {
  get provinces(): Province[] {
    return provinces;
  },
  get districts(): District[] {
    return districts;
  },
  get localLevels(): LocalLevel[] {
    return localLevels;
  },
  get protectedAreas(): ProtectedArea[] {
    return protectedAreas;
  },

  regionsAt(level: AdminLevel | AdminLevelId): Region[] {
    const id = typeof level === 'string' ? level : level.id;
    switch (id) {
      case 'province':
        return provinces;
      case 'district':
        return districts;
      case 'localLevel':
        return localLevels;
    }
  },

  search(
    query: string,
    options: { levels?: Set<AdminLevel | AdminLevelId>; limit?: number } = {},
  ): Region[] {
    return RegionSearch.instance.search(query, options);
  },

  byCode(code: string): Region | undefined {
    return regionsByCode[code];
  },

  protectedAreaByCode(code: string): ProtectedArea | undefined {
    return protectedAreasByCode[code];
  },

  aliasesOf(code: string): string[] {
    return regionAliases[code] ?? [];
  },
};

export function adminLevelId(level: AdminLevel | AdminLevelId): AdminLevelId {
  return typeof level === 'string' ? level : level.id;
}

export function adminLevelOf(id: AdminLevelId): AdminLevel {
  return AL[id];
}
