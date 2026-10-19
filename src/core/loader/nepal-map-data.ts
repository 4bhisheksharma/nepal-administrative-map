import { Bounds } from '../geometry/bounds.js';
import { LatLng } from '../geometry/lat-lng.js';
import { geodesicArea, polygonContains } from '../geometry/polygon.js';
import { SpatialIndex } from '../geometry/spatial-index.js';
import { Nepal } from '../gazetteer/nepal.js';
import type {
  AdminLevel,
  AdminLevelId,
  District,
  LocalLevel,
  ProtectedArea,
  Province,
  Region,
} from '../models/region.js';
import { Topology } from '../topojson/topology.js';
import type { MapDataSource } from './map-data-source.js';

function levelId(level: AdminLevel | AdminLevelId): AdminLevelId {
  return typeof level === 'string' ? level : level.id;
}

/** The outline of one region or protected area. */
export class MapShape<T> {
  readonly bounds: Bounds;

  constructor(
    readonly feature: T,
    readonly polygons: Float64Array[][],
    readonly arcRefs: number[][][],
  ) {
    this.bounds = Bounds.union(
      polygons.map((p) => Bounds.ofCoords(p[0]!)),
    );
  }

  get areaKm2(): number {
    return polygonsAreaKm2(this.polygons);
  }

  contains(point: LatLng): boolean {
    return (
      this.bounds.contains(point.longitude, point.latitude) &&
      this.polygons.some((p) =>
        polygonContains(p, point.longitude, point.latitude),
      )
    );
  }
}

function polygonsAreaKm2(polygons: Float64Array[][]): number {
  let sum = 0;
  for (const p of polygons) sum += geodesicArea(p);
  return sum / 1e6;
}

/** Decoded boundaries for every level, ready to draw and hit-test. */
export class NepalMapData {
  readonly bounds: Bounds;
  private readonly byCode: Map<string, MapShape<Region>>;
  private readonly indexes: Record<AdminLevelId, SpatialIndex<MapShape<Region>>>;
  private readonly protectedIndex: SpatialIndex<MapShape<ProtectedArea>>;

  private constructor(
    readonly arcs: Float64Array[],
    readonly provinces: MapShape<Province>[],
    readonly districts: MapShape<District>[],
    readonly localLevels: MapShape<LocalLevel>[],
    readonly protectedAreas: MapShape<ProtectedArea>[],
  ) {
    this.bounds = Bounds.union(provinces.map((s) => s.bounds));
    this.byCode = new Map();
    for (const s of [...provinces, ...districts, ...localLevels] as MapShape<Region>[]) {
      this.byCode.set(s.feature.code, s);
    }
    this.indexes = {
      province: new SpatialIndex(provinces as MapShape<Region>[], (s) => s.bounds, 8),
      district: new SpatialIndex(districts as MapShape<Region>[], (s) => s.bounds),
      localLevel: new SpatialIndex(
        localLevels as MapShape<Region>[],
        (s) => s.bounds,
        64,
      ),
    };
    this.protectedIndex = new SpatialIndex(
      protectedAreas,
      (s) => s.bounds,
      8,
    );
  }

  static parse(json: string): NepalMapData {
    const topology = Topology.fromJson(JSON.parse(json) as Record<string, unknown>);

    const shapes = <T,>(
      object: string,
      lookup: (code: string) => T | undefined,
    ): MapShape<T>[] => {
      const geometries = topology.objects[object];
      if (!geometries) throw new Error(`Missing object "${object}"`);
      return geometries.map((g) => {
        const feature = lookup(g.id ?? '');
        if (feature === undefined) {
          throw new Error(`Unknown code "${g.id}" in ${object}`);
        }
        return new MapShape(
          feature,
          g.polygons.map((polygon) =>
            polygon.map((ring) => topology.ring(ring)),
          ),
          g.polygons,
        );
      });
    };

    const region = <T extends Region>(code: string): T | undefined => {
      const r = Nepal.byCode(code);
      return r as T | undefined;
    };

    return new NepalMapData(
      topology.arcs,
      shapes('provinces', region<Province>),
      shapes('districts', region<District>),
      shapes('local_levels', region<LocalLevel>),
      shapes('protected_areas', (c) => Nepal.protectedAreaByCode(c)),
    );
  }

  private static cache = new Map<unknown, Promise<NepalMapData>>();

  static load(source: MapDataSource): Promise<NepalMapData> {
    const key = source.cacheKey;
    let pending = NepalMapData.cache.get(key);
    if (!pending) {
      pending = (async () => {
        try {
          const json = await source.load();
          return NepalMapData.parse(json);
        } catch (e) {
          NepalMapData.cache.delete(key);
          throw e;
        }
      })();
      NepalMapData.cache.set(key, pending);
    }
    return pending;
  }

  static clearCache(): void {
    NepalMapData.cache.clear();
  }

  shapesOf(level: AdminLevel | AdminLevelId): MapShape<Region>[] {
    const id = levelId(level);
    switch (id) {
      case 'province':
        return this.provinces as MapShape<Region>[];
      case 'district':
        return this.districts as MapShape<Region>[];
      case 'localLevel':
        return this.localLevels as MapShape<Region>[];
    }
  }

  shapeOf(region: Region): MapShape<Region> {
    return this.byCode.get(region.code)!;
  }

  protectedAreaShapeOf(area: ProtectedArea): MapShape<ProtectedArea> {
    return this.protectedAreas.find((s) => s.feature.code === area.code)!;
  }

  regionAt(point: LatLng, level: AdminLevel | AdminLevelId): Region | undefined {
    for (const shape of this.indexes[levelId(level)].query(
      point.longitude,
      point.latitude,
    )) {
      if (shape.contains(point)) return shape.feature;
    }
    return undefined;
  }

  provinceAt(point: LatLng): Province | undefined {
    return this.regionAt(point, 'province') as Province | undefined;
  }

  districtAt(point: LatLng): District | undefined {
    return this.regionAt(point, 'district') as District | undefined;
  }

  localLevelAt(point: LatLng): LocalLevel | undefined {
    return this.regionAt(point, 'localLevel') as LocalLevel | undefined;
  }

  protectedAreaAt(point: LatLng): ProtectedArea | undefined {
    for (const shape of this.protectedIndex.query(
      point.longitude,
      point.latitude,
    )) {
      if (shape.contains(point)) return shape.feature;
    }
    return undefined;
  }
}
