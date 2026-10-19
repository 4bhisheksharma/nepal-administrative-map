/** Signed area of a ring (shoelace). Use Math.abs for size. */
export function ringSignedArea(ring: Float64Array | number[]): number {
  let sum = 0;
  const n = ring.length;
  for (let i = 0, j = n - 2; i < n; j = i, i += 2) {
    sum += (ring[j]! - ring[i]!) * (ring[j + 1]! + ring[i + 1]!);
  }
  return sum / 2;
}

/** Area of a polygon: outer ring minus holes. */
export function polygonArea(rings: (Float64Array | number[])[]): number {
  let area = Math.abs(ringSignedArea(rings[0]!));
  for (let i = 1; i < rings.length; i++) {
    area -= Math.abs(ringSignedArea(rings[i]!));
  }
  return area;
}

/** Area-weighted centroid of a ring. */
export function ringCentroid(
  ring: Float64Array | number[],
): { x: number; y: number } {
  let cx = 0;
  let cy = 0;
  let area = 0;
  const n = ring.length;
  for (let i = 0, j = n - 2; i < n; j = i, i += 2) {
    const f = ring[j]! * ring[i + 1]! - ring[i]! * ring[j + 1]!;
    cx += (ring[j]! + ring[i]!) * f;
    cy += (ring[j + 1]! + ring[i + 1]!) * f;
    area += f * 3;
  }
  if (area === 0) return { x: ring[0]!, y: ring[1]! };
  return { x: cx / area, y: cy / area };
}

/** Even-odd point-in-polygon (holes excluded). */
export function polygonContains(
  rings: (Float64Array | number[])[],
  x: number,
  y: number,
): boolean {
  let inside = false;
  for (const ring of rings) {
    const n = ring.length;
    for (let i = 0, j = n - 2; i < n; j = i, i += 2) {
      const xi = ring[i]!;
      const yi = ring[i + 1]!;
      const xj = ring[j]!;
      const yj = ring[j + 1]!;
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
        inside = !inside;
      }
    }
  }
  return inside;
}

/** Earth's radius used for areas, in metres (WGS84 equatorial). */
export const earthRadiusMeters = 6378137;

/** Spherical polygon area in square metres for `[lng, lat, …]` degrees. */
export function geodesicArea(rings: (Float64Array | number[])[]): number {
  const ringArea = (r: Float64Array | number[]): number => {
    let sum = 0;
    const toRad = Math.PI / 180;
    for (let i = 0, j = r.length - 2; i < r.length; j = i, i += 2) {
      sum +=
        (r[i]! - r[j]!) *
        toRad *
        (2 + Math.sin(r[j + 1]! * toRad) + Math.sin(r[i + 1]! * toRad));
    }
    return Math.abs((sum * earthRadiusMeters * earthRadiusMeters) / 2);
  };

  let area = ringArea(rings[0]!);
  for (let i = 1; i < rings.length; i++) {
    area -= ringArea(rings[i]!);
  }
  return area;
}
