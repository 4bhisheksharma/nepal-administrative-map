import { Bounds } from './bounds.js';

/** A uniform grid over item bounding boxes, for fast point lookups. */
export class SpatialIndex<T> {
  private readonly items: T[];
  private readonly bounds: Bounds[];
  private readonly n: number;
  private readonly cells: number[][];
  readonly extent: Bounds;

  constructor(
    items: T[],
    boundsOf: (item: T) => Bounds,
    cellsPerSide = 32,
  ) {
    this.items = items;
    this.bounds = items.map(boundsOf);
    this.n = cellsPerSide;
    this.cells = Array.from({ length: cellsPerSide * cellsPerSide }, () => []);
    this.extent =
      items.length === 0
        ? new Bounds(0, 0, 0, 0)
        : Bounds.union(items.map(boundsOf));

    for (let i = 0; i < this.items.length; i++) {
      const b = this.bounds[i]!;
      for (let cy = this.cellY(b.minY); cy <= this.cellY(b.maxY); cy++) {
        for (let cx = this.cellX(b.minX); cx <= this.cellX(b.maxX); cx++) {
          this.cells[cy * this.n + cx]!.push(i);
        }
      }
    }
  }

  *query(x: number, y: number): Generator<T> {
    if (this.items.length === 0 || !this.extent.contains(x, y)) return;
    for (const i of this.cells[this.cellY(y) * this.n + this.cellX(x)]!) {
      if (this.bounds[i]!.contains(x, y)) yield this.items[i]!;
    }
  }

  private cellX(x: number): number {
    return this.cell(x, this.extent.minX, this.extent.width);
  }

  private cellY(y: number): number {
    return this.cell(y, this.extent.minY, this.extent.height);
  }

  private cell(v: number, min: number, size: number): number {
    if (size === 0) return 0;
    return Math.min(this.n - 1, Math.max(0, Math.floor(((v - min) / size) * this.n)));
  }
}
