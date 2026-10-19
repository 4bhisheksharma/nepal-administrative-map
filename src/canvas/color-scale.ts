import type { LocalizedName } from '../core/i18n/localized-name.js';

export type ScaleDomain = { min: number; max: number };

/** Maps data values to colours for a choropleth map. */
export abstract class ColorScale {
  abstract colorOf(value: unknown, extent: ScaleDomain): string | undefined;

  static sequential(
    from: string,
    to: string,
    domain?: ScaleDomain,
  ): SequentialScale {
    return new SequentialScale(from, to, domain);
  }

  static diverging(
    low: string,
    mid: string,
    high: string,
    options: { midpoint?: number; domain?: ScaleDomain } = {},
  ): DivergingScale {
    return new DivergingScale(low, mid, high, options.midpoint, options.domain);
  }

  static threshold(breaks: number[], colors: string[]): ThresholdScale {
    return new ThresholdScale(breaks, colors);
  }

  static categorical(
    colors: Map<unknown, string> | Record<string, string>,
    labels?: Map<unknown, LocalizedName> | Record<string, LocalizedName>,
  ): CategoricalScale {
    const colorMap =
      colors instanceof Map ? colors : new Map(Object.entries(colors));
    const labelMap =
      labels instanceof Map
        ? labels
        : labels
          ? new Map(Object.entries(labels))
          : undefined;
    return new CategoricalScale(colorMap, labelMap);
  }

  static extentOf(values: Iterable<unknown>): ScaleDomain | undefined {
    let min: number | undefined;
    let max: number | undefined;
    for (const v of values) {
      if (typeof v !== 'number' || !Number.isFinite(v)) continue;
      if (min === undefined || v < min) min = v;
      if (max === undefined || v > max) max = v;
    }
    return min === undefined ? undefined : { min, max: max! };
  }
}

export class SequentialScale extends ColorScale {
  constructor(
    readonly from: string,
    readonly to: string,
    readonly domain?: ScaleDomain,
  ) {
    super();
  }

  colorOf(value: unknown, extent: ScaleDomain): string | undefined {
    if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
    const d = this.domain ?? extent;
    return lerpOklab(this.from, this.to, fraction(value, d.min, d.max));
  }
}

export class DivergingScale extends ColorScale {
  constructor(
    readonly low: string,
    readonly mid: string,
    readonly high: string,
    readonly midpoint?: number,
    readonly domain?: ScaleDomain,
  ) {
    super();
  }

  midOf(extent: ScaleDomain): number {
    const d = this.domain ?? extent;
    return this.midpoint ?? (d.min + d.max) / 2;
  }

  colorOf(value: unknown, extent: ScaleDomain): string | undefined {
    if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
    const d = this.domain ?? extent;
    const m = this.midOf(extent);
    return value < m
      ? lerpOklab(this.low, this.mid, fraction(value, d.min, m))
      : lerpOklab(this.mid, this.high, fraction(value, m, d.max));
  }
}

export class ThresholdScale extends ColorScale {
  constructor(
    readonly breaks: number[],
    readonly colors: string[],
  ) {
    super();
    if (colors.length !== breaks.length + 1) {
      throw new Error('colors needs one more entry than breaks');
    }
  }

  colorOf(value: unknown, _extent: ScaleDomain): string | undefined {
    if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
    let i = 0;
    while (i < this.breaks.length && value >= this.breaks[i]!) i++;
    return this.colors[i];
  }
}

export class CategoricalScale extends ColorScale {
  constructor(
    readonly colors: Map<unknown, string>,
    readonly labels?: Map<unknown, LocalizedName>,
  ) {
    super();
  }

  colorOf(value: unknown, _extent: ScaleDomain): string | undefined {
    return this.colors.get(value);
  }
}

function fraction(value: number, min: number, max: number): number {
  if (max === min) return 0.5;
  return Math.min(1, Math.max(0, (value - min) / (max - min)));
}

function parseColor(css: string): { r: number; g: number; b: number; a: number } {
  if (css.startsWith('#')) {
    const hex = css.slice(1);
    const full =
      hex.length === 3
        ? hex
            .split('')
            .map((c) => c + c)
            .join('')
        : hex.length === 8
          ? hex
          : hex.padEnd(6, '0');
    const n = Number.parseInt(full.slice(0, 6), 16);
    const a =
      full.length === 8 ? Number.parseInt(full.slice(6, 8), 16) / 255 : 1;
    return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255, a };
  }
  const m = css.match(
    /rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)/,
  );
  if (m) {
    return {
      r: Number(m[1]) / 255,
      g: Number(m[2]) / 255,
      b: Number(m[3]) / 255,
      a: m[4] !== undefined ? Number(m[4]) : 1,
    };
  }
  return { r: 0, g: 0, b: 0, a: 1 };
}

function toCss(r: number, g: number, b: number, a: number): string {
  const R = Math.round(clamp01(r) * 255);
  const G = Math.round(clamp01(g) * 255);
  const B = Math.round(clamp01(b) * 255);
  if (a >= 1) return `rgb(${R}, ${G}, ${B})`;
  return `rgba(${R}, ${G}, ${B}, ${clamp01(a)})`;
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

function toLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function toSrgb(c: number): number {
  return c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055;
}

function cbrt(x: number): number {
  return Math.sign(x) * Math.abs(x) ** (1 / 3);
}

function toOklab(c: { r: number; g: number; b: number }): [number, number, number] {
  const r = toLinear(c.r);
  const g = toLinear(c.g);
  const b = toLinear(c.b);
  const l = cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s,
  ];
}

function fromOklab(L: number, a: number, b: number, alpha: number): string {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3;
  return toCss(
    toSrgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    toSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    toSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s),
    alpha,
  );
}

export function lerpOklab(aCss: string, bCss: string, t: number): string {
  if (t <= 0) return aCss;
  if (t >= 1) return bCss;
  const a = parseColor(aCss);
  const b = parseColor(bCss);
  const [l1, a1, b1] = toOklab(a);
  const [l2, a2, b2] = toOklab(b);
  const mix = (x: number, y: number) => x + (y - x) * t;
  return fromOklab(mix(l1, l2), mix(a1, a2), mix(b1, b2), mix(a.a, b.a));
}
