export interface TopoGeometry {
  id: string | null;
  /** Polygons → rings → arc indices. Negative index `~i` means arc i reversed. */
  polygons: number[][][];
}

/** A decoded TopoJSON topology. */
export class Topology {
  private constructor(
    readonly arcs: Float64Array[],
    readonly objects: Record<string, TopoGeometry[]>,
  ) {}

  static fromJson(json: Record<string, unknown>): Topology {
    if (json.type !== 'Topology') {
      throw new FormatError('Not a TopoJSON topology');
    }
    const transform = json.transform as
      | { scale: number[]; translate: number[] }
      | undefined;
    const rawArcs = json.arcs as number[][][];
    const arcs = rawArcs.map((arc) => decodeArc(arc, transform));

    const objects: Record<string, TopoGeometry[]> = {};
    const objs = json.objects as Record<string, { geometries: Record<string, unknown>[] }>;
    for (const [key, value] of Object.entries(objs)) {
      objects[key] = value.geometries.map(geometryFromJson);
    }
    return new Topology(arcs, objects);
  }

  /** Joins arcs into one ring. A negative index `~i` means arc `i` reversed. */
  ring(arcRefs: number[]): Float64Array {
    let length = 0;
    for (const ref of arcRefs) {
      length += this.arcs[ref < 0 ? ~ref : ref]!.length - 2;
    }
    const out = new Float64Array(length + 2);
    let o = 0;
    for (let k = 0; k < arcRefs.length; k++) {
      const ref = arcRefs[k]!;
      const arc = this.arcs[ref < 0 ? ~ref : ref]!;
      const points = arc.length / 2;
      for (let p = k === 0 ? 0 : 1; p < points; p++) {
        const src = ref < 0 ? points - 1 - p : p;
        out[o++] = arc[src * 2]!;
        out[o++] = arc[src * 2 + 1]!;
      }
    }
    return out;
  }
}

function geometryFromJson(json: Record<string, unknown>): TopoGeometry {
  const polygon = (rings: unknown[]): number[][] =>
    rings.map((ring) => (ring as number[]).map((i) => i));

  const arcs = json.arcs as unknown[];
  switch (json.type) {
    case 'Polygon':
      return { id: (json.id as string) ?? null, polygons: [polygon(arcs)] };
    case 'MultiPolygon':
      return {
        id: (json.id as string) ?? null,
        polygons: arcs.map((p) => polygon(p as unknown[])),
      };
    default:
      throw new FormatError(`Unsupported geometry type: ${json.type}`);
  }
}

function decodeArc(
  arc: number[][],
  transform?: { scale: number[]; translate: number[] },
): Float64Array {
  const out = new Float64Array(arc.length * 2);
  if (!transform) {
    for (let i = 0; i < arc.length; i++) {
      out[i * 2] = Number(arc[i]![0]);
      out[i * 2 + 1] = Number(arc[i]![1]);
    }
    return out;
  }
  const sx = Number(transform.scale[0]);
  const sy = Number(transform.scale[1]);
  const tx = Number(transform.translate[0]);
  const ty = Number(transform.translate[1]);
  let x = 0;
  let y = 0;
  for (let i = 0; i < arc.length; i++) {
    x += Number(arc[i]![0]);
    y += Number(arc[i]![1]);
    out[i * 2] = x * sx + tx;
    out[i * 2 + 1] = y * sy + ty;
  }
  return out;
}

class FormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FormatError';
  }
}
