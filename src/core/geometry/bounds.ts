/** An axis-aligned rectangle in planar coordinates. */
export class Bounds {
  constructor(
    readonly minX: number,
    readonly minY: number,
    readonly maxX: number,
    readonly maxY: number,
  ) {}

  static ofCoords(coords: Float64Array | number[]): Bounds {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (let i = 0; i < coords.length; i += 2) {
      const x = coords[i]!;
      const y = coords[i + 1]!;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    return new Bounds(minX, minY, maxX, maxY);
  }

  static union(bounds: Iterable<Bounds>): Bounds {
    let first = true;
    let result = new Bounds(0, 0, 0, 0);
    for (const b of bounds) {
      result = first ? b : result.expand(b);
      first = false;
    }
    return result;
  }

  get width(): number {
    return this.maxX - this.minX;
  }

  get height(): number {
    return this.maxY - this.minY;
  }

  contains(x: number, y: number): boolean {
    return x >= this.minX && x <= this.maxX && y >= this.minY && y <= this.maxY;
  }

  intersects(other: Bounds): boolean {
    return (
      other.minX <= this.maxX &&
      other.maxX >= this.minX &&
      other.minY <= this.maxY &&
      other.maxY >= this.minY
    );
  }

  expand(other: Bounds): Bounds {
    return new Bounds(
      Math.min(this.minX, other.minX),
      Math.min(this.minY, other.minY),
      Math.max(this.maxX, other.maxX),
      Math.max(this.maxY, other.maxY),
    );
  }
}
