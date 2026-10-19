import type { ReactNode } from 'react';
import type { MapEngine, MapMarker } from '../canvas/map-engine.js';
import { LatLng } from '../core/geometry/lat-lng.js';

export type { MapMarker };

/** Factory helpers matching the Flutter MapMarker API. */
export const MapMarkers = {
  dot(
    point: LatLng | { latitude: number; longitude: number },
    options: { color?: string; radius?: number; data?: unknown } = {},
  ): MapMarker {
    const p =
      point instanceof LatLng
        ? point
        : new LatLng(point.latitude, point.longitude);
    return {
      point: p,
      color: options.color,
      radius: options.radius ?? 4,
      data: options.data,
      isDot: true,
    };
  },

  widget(
    point: LatLng | { latitude: number; longitude: number },
    child: ReactNode,
    options: {
      size?: { width: number; height: number };
      alignment?: 'bottom-center' | 'center' | 'top-center';
      data?: unknown;
    } = {},
  ): MapMarker {
    const p =
      point instanceof LatLng
        ? point
        : new LatLng(point.latitude, point.longitude);
    return {
      point: p,
      child,
      size: options.size ?? { width: 32, height: 32 },
      alignment: options.alignment ?? 'bottom-center',
      data: options.data,
      isDot: false,
    };
  },
};

export interface MarkerOverlayProps {
  engine: MapEngine | null;
  markers: MapMarker[];
  onMarkerTap?: (marker: MapMarker) => void;
}

/** Positions React children for non-dot markers. */
export function MarkerOverlay({
  engine,
  markers,
  onMarkerTap,
}: MarkerOverlayProps) {
  if (!engine) return null;
  const view = engine.view;
  const widgetMarkers = markers.filter((m) => m.child);

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      {widgetMarkers.map((m, i) => {
        const p = engine.plane.project(m.point);
        const s = view.toScreen(p.x, p.y);
        const size = m.size ?? { width: 32, height: 32 };
        const align = m.alignment ?? 'bottom-center';
        let tx = '-50%';
        let ty = '-100%';
        if (align === 'center') ty = '-50%';
        if (align === 'top-center') ty = '0%';
        return (
          <button
            key={i}
            type="button"
            onClick={() => onMarkerTap?.(m)}
            style={{
              position: 'absolute',
              left: s.x,
              top: s.y,
              width: size.width,
              height: size.height,
              transform: `translate(${tx}, ${ty})`,
              pointerEvents: 'auto',
              border: 'none',
              background: 'transparent',
              padding: 0,
              cursor: 'pointer',
            }}
          >
            {m.child as ReactNode}
          </button>
        );
      })}
    </div>
  );
}
