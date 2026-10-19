import { Bounds } from '../core/geometry/bounds.js';
import { LatLng } from '../core/geometry/lat-lng.js';
import { WebMercator } from '../core/geometry/projection.js';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Padding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/** Web Mercator shifted so Nepal spans {@link MapPlane.width} units. */
export class MapPlane {
  static readonly width = 1000;
  readonly height: number;
  private readonly x0: number;
  private readonly y0: number;
  private readonly k: number;

  private constructor(x0: number, y0: number, k: number, height: number) {
    this.x0 = x0;
    this.y0 = y0;
    this.k = k;
    this.height = height;
  }

  static fromBounds(bounds: Bounds): MapPlane {
    const topLeft = WebMercator.project(new LatLng(bounds.maxY, bounds.minX));
    const bottomRight = WebMercator.project(
      new LatLng(bounds.minY, bounds.maxX),
    );
    const k = MapPlane.width / (bottomRight.x - topLeft.x);
    return new MapPlane(
      topLeft.x,
      topLeft.y,
      k,
      (bottomRight.y - topLeft.y) * k,
    );
  }

  get rect(): Rect {
    return { x: 0, y: 0, width: MapPlane.width, height: this.height };
  }

  project(point: LatLng): { x: number; y: number } {
    const p = WebMercator.project(point);
    return { x: (p.x - this.x0) * this.k, y: (p.y - this.y0) * this.k };
  }

  unproject(p: { x: number; y: number }): LatLng {
    return WebMercator.unproject(p.x / this.k + this.x0, p.y / this.k + this.y0);
  }

  projectCoords(lngLat: Float64Array | number[]): Float64Array {
    const out = WebMercator.projectCoords(lngLat);
    for (let i = 0; i < out.length; i += 2) {
      out[i] = (out[i]! - this.x0) * this.k;
      out[i + 1] = (out[i + 1]! - this.y0) * this.k;
    }
    return out;
  }

  rectOf(bounds: Bounds): Rect {
    const a = this.project(new LatLng(bounds.maxY, bounds.minX));
    const b = this.project(new LatLng(bounds.minY, bounds.maxX));
    return {
      x: Math.min(a.x, b.x),
      y: Math.min(a.y, b.y),
      width: Math.abs(b.x - a.x),
      height: Math.abs(b.y - a.y),
    };
  }
}

/** Maps plane coordinates to widget pixels: `pixel = plane * scale + offset`. */
export class ViewTransform {
  constructor(
    readonly scale: number,
    readonly offsetX: number,
    readonly offsetY: number,
  ) {}

  static fit(content: Rect, size: Size, padding: Padding): ViewTransform {
    const availW = size.width - padding.left - padding.right;
    const availH = size.height - padding.top - padding.bottom;
    if (content.width <= 0 || content.height <= 0 || availW <= 0 || availH <= 0) {
      return new ViewTransform(1, 0, 0);
    }
    const scale = Math.min(availW / content.width, availH / content.height);
    const offsetX =
      padding.left + (availW - content.width * scale) / 2 - content.x * scale;
    const offsetY =
      padding.top + (availH - content.height * scale) / 2 - content.y * scale;
    return new ViewTransform(scale, offsetX, offsetY);
  }

  toScreen(planeX: number, planeY: number): { x: number; y: number } {
    return {
      x: planeX * this.scale + this.offsetX,
      y: planeY * this.scale + this.offsetY,
    };
  }

  toPlane(screenX: number, screenY: number): { x: number; y: number } {
    return {
      x: (screenX - this.offsetX) / this.scale,
      y: (screenY - this.offsetY) / this.scale,
    };
  }

  /** Sets the canvas transform for plane → CSS pixels, scaled by device pixel ratio. */
  apply(ctx: CanvasRenderingContext2D, pixelRatio = 1): void {
    ctx.setTransform(
      this.scale * pixelRatio,
      0,
      0,
      this.scale * pixelRatio,
      this.offsetX * pixelRatio,
      this.offsetY * pixelRatio,
    );
  }
}
