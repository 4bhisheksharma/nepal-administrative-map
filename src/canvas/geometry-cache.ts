import type { MapShape } from '../core/loader/nepal-map-data.js';
import { polygonArea } from '../core/geometry/polygon.js';
import { polylabel } from '../core/geometry/polylabel.js';
import type { Region } from '../core/models/region.js';
import type { MapPlane } from './map-plane.js';

export interface LabelAnchor {
  x: number;
  y: number;
  distance: number;
  area: number;
}

/** Cached Path2D objects and label anchors in plane space. */
export class GeometryCache {
  private readonly paths = new WeakMap<object, Path2D>();
  private readonly anchors = new WeakMap<object, LabelAnchor>();
  private readonly planePaths = new WeakMap<object, Path2D>();

  pathOf(shape: MapShape<unknown>, plane: MapPlane): Path2D {
    const cached = this.planePaths.get(shape);
    if (cached) return cached;
    const path = new Path2D();
    for (const polygon of shape.polygons) {
      for (let r = 0; r < polygon.length; r++) {
        const coords = plane.projectCoords(polygon[r]!);
        if (coords.length < 4) continue;
        path.moveTo(coords[0]!, coords[1]!);
        for (let i = 2; i < coords.length; i += 2) {
          path.lineTo(coords[i]!, coords[i + 1]!);
        }
        path.closePath();
      }
    }
    this.planePaths.set(shape, path);
    return path;
  }

  /** Geographic Path2D (lng/lat) — rarely used; prefer pathOf with plane. */
  geoPathOf(shape: MapShape<unknown>): Path2D {
    let cached = this.paths.get(shape);
    if (cached) return cached;
    cached = new Path2D();
    for (const polygon of shape.polygons) {
      for (const ring of polygon) {
        if (ring.length < 4) continue;
        cached.moveTo(ring[0]!, ring[1]!);
        for (let i = 2; i < ring.length; i += 2) {
          cached.lineTo(ring[i]!, ring[i + 1]!);
        }
        cached.closePath();
      }
    }
    this.paths.set(shape, cached);
    return cached;
  }

  labelAnchor(shape: MapShape<Region>, plane: MapPlane): LabelAnchor {
    const cached = this.anchors.get(shape);
    if (cached) return cached;

    let best: LabelAnchor | undefined;
    for (const polygon of shape.polygons) {
      const projected = polygon.map((ring) => plane.projectCoords(ring));
      const area = polygonArea(projected);
      const label = polylabel(projected);
      if (!best || area > best.area) {
        best = { x: label.x, y: label.y, distance: label.distance, area };
      }
    }
    const result = best ?? { x: 0, y: 0, distance: 0, area: 0 };
    this.anchors.set(shape, result);
    return result;
  }
}
