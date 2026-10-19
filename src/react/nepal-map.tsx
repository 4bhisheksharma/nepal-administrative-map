import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { Choropleth } from '../canvas/choropleth.js';
import {
  MapEngine,
  type LabelMode,
  type MapLayer,
  type MapMarker,
  type SelectionMode,
} from '../canvas/map-engine.js';
import {
  darkTheme,
  lightTheme,
  type NepalMapTheme,
  type RegionStyleBuilder,
} from '../canvas/theme.js';
import type { MapLanguage } from '../core/i18n/map-language.js';
import { NepalMapStrings } from '../core/i18n/nepal-map-strings.js';
import {
  AssetMapDataSource,
  MapDataSource,
} from '../core/loader/map-data-source.js';
import { NepalMapData } from '../core/loader/nepal-map-data.js';
import type { AdminLevel, AdminLevelId, Region } from '../core/models/region.js';
import { NepalMapController } from './controller.js';
import { NepalMapLegend } from './legend.js';
import { MarkerOverlay } from './markers.js';

export const ATTRIBUTION =
  'Boundary data © OKNP LocalBoundaries, CC BY 4.0';
export const PACKAGE_CREDIT = 'Map © Abhishek Sharma';
export const ATTRIBUTION_URL = 'https://creativecommons.org/licenses/by/4.0/';

export function attributionText(includePackageCredit = true): string {
  return includePackageCredit
    ? `${PACKAGE_CREDIT} · ${ATTRIBUTION}`
    : ATTRIBUTION;
}

export interface NepalMapProps {
  controller?: NepalMapController;
  level?: AdminLevel | AdminLevelId;
  scope?: Region | null;
  drillDown?: boolean;
  onScopeChanged?: (scope: Region | undefined) => void;
  style?: RegionStyleBuilder;
  onRegionTap?: (region: Region) => void;
  onRegionHover?: (region: Region | undefined) => void;
  selectionMode?: SelectionMode;
  selected?: Set<Region> | Region[];
  onSelectionChanged?: (selected: Set<Region>) => void;
  language?: MapLanguage;
  strings?: NepalMapStrings;
  labelMode?: LabelMode | null;
  labelBuilder?: (region: Region, language: MapLanguage) => string | null;
  showTooltips?: boolean;
  tooltipBuilder?: (region: Region, language: MapLanguage) => ReactNode;
  interactive?: boolean;
  minZoom?: number;
  maxZoom?: number;
  /** Drill-down / zoomTo animation length in ms (default 400). */
  animationDuration?: number;
  theme?: NepalMapTheme | 'light' | 'dark';
  padding?: number | { top: number; right: number; bottom: number; left: number };
  placeholder?: ReactNode;
  errorBuilder?: (error: unknown) => ReactNode;
  showAttribution?: boolean;
  showPackageCredit?: boolean;
  onAttributionTap?: () => void;
  dataSource?: MapDataSource;
  mapDataUrl?: string;
  choropleth?: Choropleth | null;
  markers?: MapMarker[];
  onMarkerTap?: (marker: MapMarker) => void;
  showProtectedAreas?: boolean;
  extraLayers?: MapLayer[];
  className?: string;
  styleProp?: CSSProperties;
}

let preloadPromise: Promise<NepalMapData> | null = null;

/** Start decoding map data before the first render. */
export function preloadNepalMap(
  source: MapDataSource | string,
): Promise<NepalMapData> {
  const resolved =
    typeof source === 'string' ? new AssetMapDataSource(source) : source;
  return (preloadPromise ??= NepalMapData.load(resolved));
}

export function NepalMap(props: NepalMapProps) {
  const {
    controller,
    level = 'province',
    scope = null,
    drillDown = false,
    onScopeChanged,
    style: styleBuilder,
    onRegionTap,
    onRegionHover,
    selectionMode = 'single',
    selected,
    onSelectionChanged,
    language = 'en',
    strings,
    labelMode,
    labelBuilder,
    showTooltips = true,
    tooltipBuilder,
    interactive = true,
    minZoom = 1,
    maxZoom = 40,
    animationDuration = 400,
    theme: themeProp = 'light',
    padding = 8,
    placeholder,
    errorBuilder,
    showAttribution = true,
    showPackageCredit = true,
    onAttributionTap,
    dataSource,
    mapDataUrl,
    choropleth,
    markers = [],
    onMarkerTap,
    showProtectedAreas = false,
    extraLayers = [],
    className,
    styleProp,
  } = props;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<MapEngine | null>(null);
  const [data, setData] = useState<NepalMapData | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [tooltip, setTooltip] = useState<{
    region: Region;
    x: number;
    y: number;
  } | null>(null);
  const [, setTick] = useState(0);
  const rerender = useCallback(() => setTick((t) => t + 1), []);
  const hasWidgetMarkers = markers.some((m) => m.child);

  const pad = useMemo(
    () =>
      typeof padding === 'number'
        ? { top: padding, right: padding, bottom: padding, left: padding }
        : padding,
    [padding],
  );

  const theme: NepalMapTheme = useMemo(() => {
    if (themeProp === 'dark') return darkTheme();
    if (themeProp === 'light') return lightTheme();
    return themeProp;
  }, [themeProp]);

  const uiStrings = strings ?? NepalMapStrings.of(language);

  useEffect(() => {
    if (!dataSource && !mapDataUrl) {
      setError(
        new Error(
          'NepalMap requires mapDataUrl or dataSource. Import the TopoJSON from ' +
            '`nepal-administrative-map/assets/maps/nepal.topo.json`.',
        ),
      );
      return;
    }
    const source =
      dataSource ?? new AssetMapDataSource(mapDataUrl!);
    let cancelled = false;
    NepalMapData.load(source)
      .then((d) => {
        if (!cancelled) {
          setError(null);
          setData(d);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e);
      });
    return () => {
      cancelled = true;
    };
  }, [dataSource, mapDataUrl]);

  useEffect(() => {
    if (!data || !canvasRef.current || !containerRef.current) return;

    const canvas = canvasRef.current;
    const container = containerRef.current;

    const engine = new MapEngine({
      data,
      level,
      scope,
      drillDown,
      theme,
      style: styleBuilder,
      choropleth,
      selectionMode,
      selected,
      language,
      labelMode: labelMode ?? null,
      labelBuilder,
      showProtectedAreas,
      markers,
      interactive,
      minZoom,
      maxZoom,
      animationDuration,
      padding: pad,
      extraLayers,
      onRegionTap,
      onRegionHover: (r) => {
        onRegionHover?.(r);
        if (!showTooltips) {
          setTooltip(null);
          return;
        }
        // Position updated on move
      },
      onScopeChanged: (s) => {
        onScopeChanged?.(s);
        controller?.notify();
      },
      onSelectionChanged: (sel) => {
        onSelectionChanged?.(sel);
        controller?.notify();
      },
      onMarkerTap,
      onChange: () => {
        paint();
        // Reposition React marker overlays without notifying the controller
        // (which would re-render the whole app and loop).
        if (hasWidgetMarkers) rerender();
      },
    });

    engineRef.current = engine;
    controller?.attach(engine);

    let painting = false;
    const paint = () => {
      if (painting) return;
      painting = true;
      try {
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const dpr = window.devicePixelRatio || 1;
        // Size from the canvas's displayed box so hit-tests (also from this
        // rect) match the drawn map — not the container if they differ.
        const rect = canvas.getBoundingClientRect();
        const w = Math.max(1, rect.width);
        const h = Math.max(1, rect.height);
        const bw = Math.max(1, Math.floor(w * dpr));
        const bh = Math.max(1, Math.floor(h * dpr));
        if (canvas.width !== bw || canvas.height !== bh) {
          canvas.width = bw;
          canvas.height = bh;
        }
        // Silent resize — notifying here would recurse through onChange → paint.
        engine.resize(w, h, false);
        engine.paint(ctx, dpr);
      } finally {
        painting = false;
      }
    };

    paint();

    const ro = new ResizeObserver(() => paint());
    ro.observe(container);

    const rel = (e: PointerEvent | WheelEvent) => {
      const r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };

    const onDown = (e: PointerEvent) => {
      canvas.setPointerCapture(e.pointerId);
      const { x, y } = rel(e);
      engine.handlePointerDown(e.pointerId, x, y);
    };
    const onMove = (e: PointerEvent) => {
      const { x, y } = rel(e);
      engine.handlePointerMove(e.pointerId, x, y);
      if (showTooltips && engine.isTapGesture()) {
        const region = engine.hitTest(x, y);
        if (region) setTooltip({ region, x, y });
        else setTooltip(null);
      }
    };
    const onUp = (e: PointerEvent) => {
      const { x, y } = rel(e);
      setTooltip(null);
      engine.handlePointerUp(e.pointerId, x, y);
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    };
    const onLeave = () => {
      setTooltip(null);
      engine.hovered = undefined;
      onRegionHover?.(undefined);
      paint();
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const { x, y } = rel(e);
      engine.handleWheel(x, y, e.deltaY);
    };
    const onDbl = (e: MouseEvent) => {
      const { x, y } = rel(e as unknown as PointerEvent);
      engine.handleDoubleClick(x, y);
    };

    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);
    canvas.addEventListener('pointerleave', onLeave);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('dblclick', onDbl);

    return () => {
      ro.disconnect();
      controller?.detach(engine);
      engineRef.current = null;
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
      canvas.removeEventListener('pointerleave', onLeave);
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('dblclick', onDbl);
    };
    // Intentionally recreate when structural props change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  // Sync mutable props into engine
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    const nextLevel =
      typeof level === 'string' ? level : (level as AdminLevel).id;
    // In drill-down mode the engine owns level/scope; props would reset
    // every parent re-render (e.g. onRegionTap) and undo the drill.
    if (!drillDown) {
      engine.level = nextLevel;
      engine.scope = scope ?? undefined;
    } else if (!engine.drillDown) {
      // Entering drill-down: start at the country overview.
      engine.level = 'province';
      engine.scope = undefined;
      engine.camera = { zoom: 1, panX: 0, panY: 0 };
    }
    engine.drillDown = drillDown;
    engine.theme = theme;
    engine.styleBuilder = styleBuilder;
    engine.choropleth = choropleth;
    engine.selectionMode = selectionMode;
    if (selected) {
      engine.selected =
        selected instanceof Set ? selected : new Set(selected);
    }
    engine.language = language;
    if (labelMode != null) engine.labelMode = labelMode;
    else engine.labelMode = language === 'ne' ? 'ne' : 'en';
    engine.labelBuilder = labelBuilder;
    engine.showProtectedAreas = showProtectedAreas;
    engine.markers = markers;
    engine.interactive = interactive;
    engine.minZoom = minZoom;
    engine.maxZoom = maxZoom;
    engine.animationDuration = animationDuration;
    engine.padding = pad;
    engine.extraLayers = extraLayers;
    engine.onRegionTap = onRegionTap;
    engine.onSelectionChanged = (sel) => {
      onSelectionChanged?.(sel);
      controller?.notify();
    };
    engine.onScopeChanged = (s) => {
      onScopeChanged?.(s);
      controller?.notify();
    };
    engine.onMarkerTap = onMarkerTap;
    engine.refit(false);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      const w = Math.max(1, rect.width);
      const h = Math.max(1, rect.height);
      const bw = Math.max(1, Math.floor(w * dpr));
      const bh = Math.max(1, Math.floor(h * dpr));
      if (canvas.width !== bw || canvas.height !== bh) {
        canvas.width = bw;
        canvas.height = bh;
      }
      engine.resize(w, h, false);
      engine.paint(ctx, dpr);
    }
  }, [
    level,
    scope,
    drillDown,
    theme,
    styleBuilder,
    choropleth,
    selectionMode,
    selected,
    language,
    labelMode,
    labelBuilder,
    showProtectedAreas,
    markers,
    interactive,
    minZoom,
    maxZoom,
    animationDuration,
    pad,
    extraLayers,
    onRegionTap,
    onSelectionChanged,
    onScopeChanged,
    onMarkerTap,
    controller,
  ]);

  if (error) {
    return (
      <div className={className} style={{ ...rootStyle, ...styleProp }}>
        {errorBuilder?.(error) ?? (
          <div style={{ padding: 16, color: '#c62828' }}>
            Failed to load map: {String(error)}
          </div>
        )}
      </div>
    );
  }

  if (!data) {
    return (
      <div className={className} style={{ ...rootStyle, ...styleProp }}>
        {placeholder ?? (
          <div style={{ display: 'grid', placeItems: 'center', height: '100%' }}>
            Loading map…
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ ...rootStyle, position: 'relative', ...styleProp }}
      role="img"
      aria-label="Administrative map of Nepal"
    >
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          touchAction: 'none',
          cursor: interactive ? 'grab' : 'default',
        }}
      />
      <MarkerOverlay
        engine={engineRef.current}
        markers={markers}
        onMarkerTap={onMarkerTap}
      />
      {choropleth?.showLegend ? (
        <NepalMapLegend choropleth={choropleth} language={language} strings={uiStrings} />
      ) : null}
      {showAttribution ? (
        <a
          href={ATTRIBUTION_URL}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => {
            if (onAttributionTap) {
              e.preventDefault();
              onAttributionTap();
            }
          }}
          style={attributionStyle}
        >
          {attributionText(showPackageCredit)}
        </a>
      ) : null}
      {tooltip && showTooltips ? (
        <div
          style={{
            ...tooltipStyle,
            left: tooltip.x + 12,
            top: tooltip.y + 12,
          }}
        >
          {tooltipBuilder?.(tooltip.region, language) ?? (
            <>
              <div style={{ fontWeight: 600 }}>
                {tooltip.region.fullName(language)}
              </div>
              {choropleth?.values.has(tooltip.region) ? (
                <div>
                  {choropleth.title
                    ? `${choropleth.title.of(language)}: `
                    : ''}
                  {choropleth.format(
                    choropleth.values.get(tooltip.region)!,
                    language,
                  )}
                </div>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

const rootStyle: CSSProperties = {
  width: '100%',
  height: '100%',
  minHeight: 240,
  overflow: 'hidden',
};

const attributionStyle: CSSProperties = {
  position: 'absolute',
  right: 8,
  bottom: 6,
  fontSize: 10,
  color: '#546e7a',
  textDecoration: 'none',
  background: 'rgba(255,255,255,0.75)',
  padding: '2px 6px',
  borderRadius: 4,
  maxWidth: '90%',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

const tooltipStyle: CSSProperties = {
  position: 'absolute',
  pointerEvents: 'none',
  background: 'rgba(33,33,33,0.9)',
  color: '#fff',
  padding: '6px 10px',
  borderRadius: 6,
  fontSize: 12,
  zIndex: 5,
  maxWidth: 220,
};
