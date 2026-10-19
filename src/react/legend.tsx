import type { CSSProperties } from 'react';
import type { Choropleth, LegendAlignment } from '../canvas/choropleth.js';
import {
  CategoricalScale,
  DivergingScale,
  SequentialScale,
  ThresholdScale,
} from '../canvas/color-scale.js';
import type { MapLanguage } from '../core/i18n/map-language.js';
import type { NepalMapStrings } from '../core/i18n/nepal-map-strings.js';

export interface NepalMapLegendProps {
  choropleth: Choropleth;
  language?: MapLanguage;
  strings?: NepalMapStrings;
  className?: string;
  style?: CSSProperties;
}

export function NepalMapLegend({
  choropleth,
  language = 'en',
  strings,
  className,
  style,
}: NepalMapLegendProps) {
  const align = choropleth.legendAlignment;
  const items = legendItems(choropleth, language, strings?.noData ?? 'No data');

  return (
    <div
      className={className}
      style={{ ...baseStyle, ...alignmentStyle(align), ...style }}
    >
      {choropleth.title ? (
        <div style={{ fontWeight: 600, marginBottom: 6 }}>
          {choropleth.title.of(language)}
        </div>
      ) : null}
      {items.map((item, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 4,
          }}
        >
          {item.gradient ? (
            <div
              style={{
                width: 72,
                height: 10,
                borderRadius: 2,
                background: item.gradient,
              }}
            />
          ) : (
            <span
              style={{
                width: 12,
                height: 12,
                borderRadius: 2,
                background: item.color,
                flexShrink: 0,
              }}
            />
          )}
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );
}

function legendItems(
  choropleth: Choropleth,
  language: MapLanguage,
  noData: string,
): { color?: string; gradient?: string; label: string }[] {
  const { scale, extent } = choropleth;
  if (scale instanceof SequentialScale) {
    return [
      {
        gradient: `linear-gradient(90deg, ${scale.from}, ${scale.to})`,
        label: `${choropleth.format(extent.min, language)} – ${choropleth.format(extent.max, language)}`,
      },
      { color: '#eceff1', label: noData },
    ];
  }
  if (scale instanceof DivergingScale) {
    return [
      {
        gradient: `linear-gradient(90deg, ${scale.low}, ${scale.mid}, ${scale.high})`,
        label: `${choropleth.format(extent.min, language)} – ${choropleth.format(extent.max, language)}`,
      },
    ];
  }
  if (scale instanceof ThresholdScale) {
    const items = [];
    for (let i = 0; i < scale.colors.length; i++) {
      const lo = i === 0 ? '−∞' : choropleth.format(scale.breaks[i - 1]!, language);
      const hi =
        i === scale.breaks.length
          ? '+∞'
          : choropleth.format(scale.breaks[i]!, language);
      items.push({ color: scale.colors[i], label: `${lo} – ${hi}` });
    }
    return items;
  }
  if (scale instanceof CategoricalScale) {
    return [...scale.colors.entries()].map(([value, color]) => ({
      color,
      label: choropleth.format(value, language),
    }));
  }
  return [];
}

function alignmentStyle(align: LegendAlignment): CSSProperties {
  switch (align) {
    case 'bottom-end':
      return { bottom: 28, right: 8 };
    case 'top-start':
      return { top: 8, left: 8 };
    case 'top-end':
      return { top: 8, right: 8 };
    case 'bottom-start':
    default:
      return { bottom: 28, left: 8 };
  }
}

const baseStyle: CSSProperties = {
  position: 'absolute',
  zIndex: 3,
  background: 'rgba(255,255,255,0.92)',
  border: '1px solid #cfd8dc',
  borderRadius: 8,
  padding: '8px 10px',
  fontSize: 11,
  color: '#37474f',
  boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
  maxWidth: 220,
};
