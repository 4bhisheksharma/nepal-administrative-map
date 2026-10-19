import { LatLng } from './lat-lng.js';

/** Spherical Web Mercator, normalised so the world is the unit square. */
export const WebMercator = {
  maxLatitude: 85.0511287798066,

  project(point: LatLng): { x: number; y: number } {
    return { x: xOf(point.longitude), y: yOf(point.latitude) };
  },

  unproject(x: number, y: number): LatLng {
    const lat =
      (Math.atan(sinh(Math.PI * (1 - 2 * y))) * 180) / Math.PI;
    return new LatLng(
      clamp(lat, -90, 90),
      clamp(x * 360 - 180, -180, 180),
    );
  },

  projectCoords(lngLat: Float64Array | number[]): Float64Array {
    const out = new Float64Array(lngLat.length);
    for (let i = 0; i < lngLat.length; i += 2) {
      out[i] = xOf(lngLat[i]!);
      out[i + 1] = yOf(lngLat[i + 1]!);
    }
    return out;
  },
};

function xOf(lng: number): number {
  return (lng + 180) / 360;
}

function yOf(lat: number): number {
  const clamped = clamp(lat, -WebMercator.maxLatitude, WebMercator.maxLatitude);
  const phi = (clamped * Math.PI) / 180;
  return (1 - Math.log(Math.tan(Math.PI / 4 + phi / 2)) / Math.PI) / 2;
}

function sinh(v: number): number {
  return (Math.exp(v) - Math.exp(-v)) / 2;
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}
