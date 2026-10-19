import { Bounds } from './bounds.js';
import { polygonContains, ringCentroid } from './polygon.js';

/** Pole of inaccessibility (Mapbox polylabel, ISC). */
export function polylabel(
  rings: (Float64Array | number[])[],
  precision?: number,
): { x: number; y: number; distance: number } {
  const b = Bounds.ofCoords(rings[0]!);
  const cellSize = Math.min(b.width, b.height);
  if (cellSize === 0) return { x: b.minX, y: b.minY, distance: 0 };
  const tolerance = precision ?? Math.max(b.width, b.height) / 1000;

  const queue = new MaxHeap();
  const h = cellSize / 2;
  for (let x = b.minX; x < b.maxX; x += cellSize) {
    for (let y = b.minY; y < b.maxY; y += cellSize) {
      queue.push(new Cell(x + h, y + h, h, rings));
    }
  }

  const c = ringCentroid(rings[0]!);
  let best = new Cell(c.x, c.y, 0, rings);
  const boxCenter = new Cell(
    b.minX + b.width / 2,
    b.minY + b.height / 2,
    0,
    rings,
  );
  if (boxCenter.d > best.d) best = boxCenter;

  while (!queue.isEmpty) {
    const cell = queue.pop();
    if (cell.d > best.d) best = cell;
    if (cell.max - best.d <= tolerance) continue;
    const q = cell.h / 2;
    queue.push(new Cell(cell.x - q, cell.y - q, q, rings));
    queue.push(new Cell(cell.x + q, cell.y - q, q, rings));
    queue.push(new Cell(cell.x - q, cell.y + q, q, rings));
    queue.push(new Cell(cell.x + q, cell.y + q, q, rings));
  }
  return { x: best.x, y: best.y, distance: best.d };
}

class Cell {
  d: number;
  max: number;
  constructor(
    readonly x: number,
    readonly y: number,
    readonly h: number,
    rings: (Float64Array | number[])[],
  ) {
    this.d = signedDistance(x, y, rings);
    this.max = this.d + h * Math.SQRT2;
  }
}

function signedDistance(
  x: number,
  y: number,
  rings: (Float64Array | number[])[],
): number {
  let minSq = Infinity;
  for (const ring of rings) {
    const n = ring.length;
    for (let i = 0, j = n - 2; i < n; j = i, i += 2) {
      minSq = Math.min(
        minSq,
        segmentDistanceSq(x, y, ring[i]!, ring[i + 1]!, ring[j]!, ring[j + 1]!),
      );
    }
  }
  const d = Math.sqrt(minSq);
  return polygonContains(rings, x, y) ? d : -d;
}

function segmentDistanceSq(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  let x = ax;
  let y = ay;
  const dx = bx - ax;
  const dy = by - ay;
  if (dx !== 0 || dy !== 0) {
    const t = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy);
    if (t > 1) {
      x = bx;
      y = by;
    } else if (t > 0) {
      x += dx * t;
      y += dy * t;
    }
  }
  return (px - x) * (px - x) + (py - y) * (py - y);
}

class MaxHeap {
  private items: Cell[] = [];

  get isEmpty(): boolean {
    return this.items.length === 0;
  }

  push(cell: Cell): void {
    this.items.push(cell);
    let i = this.items.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.items[parent]!.max >= this.items[i]!.max) break;
      this.swap(i, parent);
      i = parent;
    }
  }

  pop(): Cell {
    const top = this.items[0]!;
    const last = this.items.pop()!;
    if (this.items.length > 0) {
      this.items[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let largest = i;
        if (l < this.items.length && this.items[l]!.max > this.items[largest]!.max) {
          largest = l;
        }
        if (r < this.items.length && this.items[r]!.max > this.items[largest]!.max) {
          largest = r;
        }
        if (largest === i) break;
        this.swap(i, largest);
        i = largest;
      }
    }
    return top;
  }

  private swap(a: number, b: number): void {
    const t = this.items[a]!;
    this.items[a] = this.items[b]!;
    this.items[b] = t;
  }
}
