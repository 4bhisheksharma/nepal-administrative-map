import type { LocalizedName } from '../core/i18n/localized-name.js';
import type { MapLanguage } from '../core/i18n/map-language.js';
import {
  NepalNumberFormat,
  type NumberGrouping,
} from '../core/i18n/nepal-number-format.js';
import { Nepal } from '../core/gazetteer/nepal.js';
import type { Region } from '../core/models/region.js';
import {
  CategoricalScale,
  ColorScale,
  type ScaleDomain,
} from './color-scale.js';
import type { NepalMapTheme, RegionStyle, RegionStyleBuilder } from './theme.js';

export type ValueFormatter = (value: unknown, language: MapLanguage) => string;

export type LegendAlignment =
  | 'bottom-start'
  | 'bottom-end'
  | 'top-start'
  | 'top-end';

/** Data to colour a map by: one value per region and a ColorScale. */
export class Choropleth {
  readonly values: Map<Region, unknown>;
  readonly scale: ColorScale;
  readonly title?: LocalizedName;
  readonly formatter?: ValueFormatter;
  readonly grouping?: NumberGrouping;
  readonly showLegend: boolean;
  readonly legendAlignment: LegendAlignment;

  constructor(options: {
    values: Map<Region, unknown> | Record<string, unknown> | Iterable<[Region, unknown]>;
    scale: ColorScale;
    title?: LocalizedName;
    formatter?: ValueFormatter;
    grouping?: NumberGrouping;
    showLegend?: boolean;
    legendAlignment?: LegendAlignment;
  }) {
    this.values = toRegionMap(options.values);
    this.scale = options.scale;
    this.title = options.title;
    this.formatter = options.formatter;
    this.grouping = options.grouping;
    this.showLegend = options.showLegend ?? true;
    this.legendAlignment = options.legendAlignment ?? 'bottom-start';
  }

  static byCode(
    values: Record<string, unknown> | Map<string, unknown>,
    options: {
      scale: ColorScale;
      title?: LocalizedName;
      formatter?: ValueFormatter;
      grouping?: NumberGrouping;
      showLegend?: boolean;
      legendAlignment?: LegendAlignment;
    },
  ): Choropleth {
    const byRegion = new Map<Region, unknown>();
    const entries =
      values instanceof Map ? values.entries() : Object.entries(values);
    for (const [key, value] of entries) {
      const region = Nepal.byCode(key);
      if (region) byRegion.set(region, value);
    }
    return new Choropleth({ values: byRegion, ...options });
  }

  get extent(): ScaleDomain {
    return ColorScale.extentOf(this.values.values()) ?? { min: 0, max: 0 };
  }

  colorOf(region: Region): string | undefined {
    return this.scale.colorOf(this.values.get(region), this.extent);
  }

  format(value: unknown, language: MapLanguage): string {
    if (this.formatter) return this.formatter(value, language);
    if (typeof value === 'number') {
      return NepalNumberFormat.format(value, {
        language,
        grouping: this.grouping,
      });
    }
    if (this.scale instanceof CategoricalScale) {
      const label = this.scale.labels?.get(value);
      if (label) return label.of(language);
    }
    return String(value);
  }

  defaultStyle(theme: NepalMapTheme): RegionStyleBuilder {
    return (region, state): RegionStyle => {
      const color = this.colorOf(region);
      const fill = color ?? theme.noDataFill;
      let outline: string | undefined;
      let outlineWidth = 2;
      if (state.isFocused) {
        outline = theme.focusOutline;
        outlineWidth = 2.5;
      } else if (state.isHighlighted) {
        outline = theme.highlightOutline;
        outlineWidth = 2.5;
      } else if (state.isSelected) {
        outline = theme.selectedOutline;
        outlineWidth = 2;
      }
      const hoverFill =
        state.isHovered && !state.isSelected && color
          ? color
          : state.isHovered
            ? theme.hoverFill
            : fill;
      return {
        fill: state.isSelected ? theme.selectedFill : hoverFill,
        outline,
        outlineWidth,
      };
    };
  }
}

function toRegionMap(
  values:
    | Map<Region, unknown>
    | Record<string, unknown>
    | Iterable<[Region, unknown]>,
): Map<Region, unknown> {
  if (values instanceof Map) return values;
  if (Symbol.iterator in Object(values) && !Array.isArray(values) && typeof values !== 'string') {
    try {
      return new Map(values as Iterable<[Region, unknown]>);
    } catch {
      /* fall through */
    }
  }
  // Plain object keyed by region code — uncommon; prefer Map or byCode.
  const map = new Map<Region, unknown>();
  for (const [k, v] of Object.entries(values as Record<string, unknown>)) {
    const region = Nepal.byCode(k);
    if (region) map.set(region, v);
  }
  return map;
}
