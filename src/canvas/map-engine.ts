import type { NepalMapData, MapShape } from '../core/loader/nepal-map-data.js';
import { LatLng } from '../core/geometry/lat-lng.js';
import type { MapLanguage } from '../core/i18n/map-language.js';
import type {
  AdminLevel,
  AdminLevelId,
  District,
  LocalLevel,
  Region,
} from '../core/models/region.js';
import { AdminLevel as AL } from '../core/models/region.js';
import type { Choropleth } from './choropleth.js';
import { GeometryCache } from './geometry-cache.js';
import {
  MapPlane,
  ViewTransform,
  type Padding,
  type Size,
} from './map-plane.js';
import {
  defaultStyle,
  lightTheme,
  type NepalMapTheme,
  type RegionStyleBuilder,
} from './theme.js';

export type SelectionMode = 'none' | 'single' | 'multi';
export type LabelMode = 'none' | 'en' | 'ne' | 'both';

export interface MapMarker {
  point: LatLng;
  /** CSS color for dot markers */
  color?: string;
  radius?: number;
  /** Optional React node handled by the React layer */
  child?: unknown;
  size?: { width: number; height: number };
  alignment?: 'bottom-center' | 'center' | 'top-center';
  data?: unknown;
  isDot?: boolean;
}

export interface MapLayer {
  screenSpace?: boolean;
  paint(ctx: CanvasRenderingContext2D, context: MapPaintContext): void;
}

export interface MapPaintContext {
  data: NepalMapData;
  plane: MapPlane;
  view: ViewTransform;
  camera: CameraState;
  level: AdminLevelId;
  scope: Region | undefined;
  theme: NepalMapTheme;
  geometry: GeometryCache;
  shapes: MapShape<Region>[];
  selected: Set<Region>;
  highlighted: Set<Region>;
  hovered: Region | undefined;
  language: MapLanguage;
}

export interface CameraState {
  /** Extra scale on top of the fit transform. */
  zoom: number;
  /** Pan in screen pixels. */
  panX: number;
  panY: number;
}

export interface MapEngineOptions {
  data: NepalMapData;
  level?: AdminLevel | AdminLevelId;
  scope?: Region | null;
  drillDown?: boolean;
  theme?: NepalMapTheme;
  style?: RegionStyleBuilder;
  choropleth?: Choropleth | null;
  selectionMode?: SelectionMode;
  selected?: Set<Region> | Region[];
  language?: MapLanguage;
  labelMode?: LabelMode | null;
  labelBuilder?: ((region: Region, language: MapLanguage) => string | null) | null;
  showProtectedAreas?: boolean;
  markers?: MapMarker[];
  interactive?: boolean;
  minZoom?: number;
  maxZoom?: number;
  padding?: Padding;
  extraLayers?: MapLayer[];
  onRegionTap?: (region: Region) => void;
  onRegionHover?: (region: Region | undefined) => void;
  onSelectionChanged?: (selected: Set<Region>) => void;
  onScopeChanged?: (scope: Region | undefined) => void;
  onMarkerTap?: (marker: MapMarker) => void;
  onChange?: () => void;
}

function asLevelId(level: AdminLevel | AdminLevelId | undefined): AdminLevelId {
  if (!level) return 'province';
  return typeof level === 'string' ? level : level.id;
}

function labelText(
  region: Region,
  mode: LabelMode,
  language: MapLanguage,
  builder?: ((region: Region, language: MapLanguage) => string | null) | null,
): string | null {
  if (builder) return builder(region, language);
  switch (mode) {
    case 'none':
      return null;
    case 'en':
      return region.name.en;
    case 'ne':
      return region.name.ne;
    case 'both':
      return region.name.en === region.name.ne
        ? region.name.en
        : `${region.name.en}\n${region.name.ne}`;
  }
}

/** Imperative canvas map engine (pan/zoom/hit-test/paint). */
export class MapEngine {
  readonly geometry = new GeometryCache();
  plane: MapPlane;
  data: NepalMapData;
  level: AdminLevelId;
  scope: Region | undefined;
  drillDown: boolean;
  theme: NepalMapTheme;
  styleBuilder?: RegionStyleBuilder;
  choropleth?: Choropleth | null;
  selectionMode: SelectionMode;
  selected = new Set<Region>();
  highlighted = new Set<Region>();
  hovered: Region | undefined;
  language: MapLanguage;
  labelMode: LabelMode;
  labelBuilder?: ((region: Region, language: MapLanguage) => string | null) | null;
  showProtectedAreas: boolean;
  markers: MapMarker[];
  interactive: boolean;
  minZoom: number;
  maxZoom: number;
  padding: Padding;
  extraLayers: MapLayer[];
  camera: CameraState = { zoom: 1, panX: 0, panY: 0 };
  size: Size = { width: 0, height: 0 };
  private fitView = new ViewTransform(1, 0, 0);

  onRegionTap?: (region: Region) => void;
  onRegionHover?: (region: Region | undefined) => void;
  onSelectionChanged?: (selected: Set<Region>) => void;
  onScopeChanged?: (scope: Region | undefined) => void;
  onMarkerTap?: (marker: MapMarker) => void;
  onChange?: () => void;

  private dragging = false;
  private dragArmed = false;
  private lastX = 0;
  private lastY = 0;
  private downX = 0;
  private downY = 0;
  private pointers = new Map<number, { x: number; y: number }>();
  private pinchDist = 0;
  /** Pixels of movement before a press becomes a pan (keeps clicks as taps). */
  static readonly dragThreshold = 5;

  constructor(options: MapEngineOptions) {
    this.data = options.data;
    this.plane = MapPlane.fromBounds(options.data.bounds);
    this.level = asLevelId(options.level);
    this.scope = options.scope ?? undefined;
    this.drillDown = options.drillDown ?? false;
    this.theme = options.theme ?? lightTheme();
    this.styleBuilder = options.style;
    this.choropleth = options.choropleth;
    this.selectionMode = options.selectionMode ?? 'single';
    this.selected = new Set(
      options.selected
        ? options.selected instanceof Set
          ? options.selected
          : options.selected
        : [],
    );
    this.language = options.language ?? 'en';
    this.labelMode =
      options.labelMode ?? (options.language === 'ne' ? 'ne' : 'en');
    this.labelBuilder = options.labelBuilder;
    this.showProtectedAreas = options.showProtectedAreas ?? false;
    this.markers = options.markers ?? [];
    this.interactive = options.interactive ?? true;
    this.minZoom = options.minZoom ?? 1;
    this.maxZoom = options.maxZoom ?? 40;
    this.padding = options.padding ?? { top: 8, right: 8, bottom: 8, left: 8 };
    this.extraLayers = options.extraLayers ?? [];
    this.onRegionTap = options.onRegionTap;
    this.onRegionHover = options.onRegionHover;
    this.onSelectionChanged = options.onSelectionChanged;
    this.onScopeChanged = options.onScopeChanged;
    this.onMarkerTap = options.onMarkerTap;
    this.onChange = options.onChange;
  }

  get view(): ViewTransform {
    const { zoom, panX, panY } = this.camera;
    return new ViewTransform(
      this.fitView.scale * zoom,
      this.fitView.offsetX * zoom +
        (this.size.width * (1 - zoom)) / 2 +
        panX,
      this.fitView.offsetY * zoom +
        (this.size.height * (1 - zoom)) / 2 +
        panY,
    );
  }

  resize(width: number, height: number, notify = true): void {
    if (this.size.width === width && this.size.height === height) {
      return;
    }
    this.size = { width, height };
    this.refit(notify);
  }

  private contentRect() {
    if (this.scope) {
      return this.plane.rectOf(this.data.shapeOf(this.scope).bounds);
    }
    return this.plane.rect;
  }

  /** Recompute the fit transform. Pass `notify: false` when painting. */
  refit(notify = true): void {
    this.fitView = ViewTransform.fit(this.contentRect(), this.size, this.padding);
    if (notify) this.notify();
  }

  resetView(): void {
    this.camera = { zoom: 1, panX: 0, panY: 0 };
    this.refit();
  }

  zoomBy(factor: number, centerX?: number, centerY?: number): void {
    const cx = centerX ?? this.size.width / 2;
    const cy = centerY ?? this.size.height / 2;
    const before = this.view.toPlane(cx, cy);
    const next = Math.min(
      this.maxZoom,
      Math.max(this.minZoom, this.camera.zoom * factor),
    );
    this.camera.zoom = next;
    const after = this.view.toPlane(cx, cy);
    const screenBefore = this.view.toScreen(before.x, before.y);
    const screenAfter = this.view.toScreen(after.x, after.y);
    this.camera.panX += screenBefore.x - screenAfter.x;
    this.camera.panY += screenBefore.y - screenAfter.y;
    this.notify();
  }

  zoomIn(): void {
    this.zoomBy(1.4);
  }

  zoomOut(): void {
    this.zoomBy(1 / 1.4);
  }

  async zoomTo(region: Region, _animate = true): Promise<void> {
    this.scope = region.level.id === 'localLevel' ? (region as LocalLevel).district : region;
    if (region.level.id === 'province') {
      this.level = 'district';
    } else if (region.level.id === 'district') {
      this.level = 'localLevel';
    }
    this.camera = { zoom: 1, panX: 0, panY: 0 };
    this.refit();
  }

  visibleShapes(): MapShape<Region>[] {
    let shapes = this.data.shapesOf(this.level);
    if (this.scope) {
      shapes = shapes.filter((s) => inScope(s.feature, this.scope!));
    }
    return shapes;
  }

  hitTest(screenX: number, screenY: number): Region | undefined {
    const plane = this.view.toPlane(screenX, screenY);
    const geo = this.plane.unproject(plane);
    return this.data.regionAt(geo, this.level);
  }

  hitTestMarker(screenX: number, screenY: number): MapMarker | undefined {
    const view = this.view;
    for (let i = this.markers.length - 1; i >= 0; i--) {
      const m = this.markers[i]!;
      const p = this.plane.project(m.point);
      const s = view.toScreen(p.x, p.y);
      const r = m.isDot !== false && !m.child ? (m.radius ?? 4) + 4 : 16;
      const dx = s.x - screenX;
      const dy = s.y - screenY;
      if (dx * dx + dy * dy <= r * r) return m;
    }
    return undefined;
  }

  setSelection(regions: Iterable<Region>): void {
    this.selected = new Set(regions);
    this.onSelectionChanged?.(this.selected);
    this.notify();
  }

  select(region: Region): void {
    this.selected = new Set([region]);
    this.onSelectionChanged?.(this.selected);
    this.notify();
  }

  clearSelection(): void {
    this.selected = new Set();
    this.onSelectionChanged?.(this.selected);
    this.notify();
  }

  highlight(regions: Iterable<Region>): void {
    this.highlighted = new Set(regions);
    this.notify();
  }

  clearHighlight(): void {
    this.highlighted = new Set();
    this.notify();
  }

  drillDownTo(region: Region): void {
    if (region.level.id === 'province') {
      this.scope = region;
      this.level = 'district';
    } else if (region.level.id === 'district') {
      this.scope = region;
      this.level = 'localLevel';
    } else {
      return;
    }
    this.camera = { zoom: 1, panX: 0, panY: 0 };
    this.onScopeChanged?.(this.scope);
    this.refit();
  }

  drillUp(): void {
    if (this.level === 'localLevel' && this.scope) {
      const district = this.scope as District;
      this.scope = district.province;
      this.level = 'district';
    } else if (this.level === 'district') {
      this.scope = undefined;
      this.level = 'province';
    } else {
      return;
    }
    this.camera = { zoom: 1, panX: 0, panY: 0 };
    this.onScopeChanged?.(this.scope);
    this.refit();
  }

  drillTo(region: Region | undefined): void {
    if (!region) {
      this.scope = undefined;
      this.level = 'province';
    } else if (region.level.id === 'province') {
      this.scope = region;
      this.level = 'district';
    } else if (region.level.id === 'district') {
      this.scope = region;
      this.level = 'localLevel';
    }
    this.camera = { zoom: 1, panX: 0, panY: 0 };
    this.onScopeChanged?.(this.scope);
    this.refit();
  }

  handlePointerDown(id: number, x: number, y: number): void {
    if (!this.interactive) return;
    this.pointers.set(id, { x, y });
    if (this.pointers.size === 1) {
      this.dragArmed = true;
      this.dragging = false;
      this.downX = x;
      this.downY = y;
      this.lastX = x;
      this.lastY = y;
    } else if (this.pointers.size === 2) {
      this.dragArmed = false;
      this.dragging = false;
      const pts = [...this.pointers.values()];
      this.pinchDist = dist(pts[0]!, pts[1]!);
    }
  }

  handlePointerMove(id: number, x: number, y: number): void {
    if (!this.interactive) return;
    if (this.pointers.has(id)) this.pointers.set(id, { x, y });

    if (this.pointers.size === 2) {
      const pts = [...this.pointers.values()];
      const d = dist(pts[0]!, pts[1]!);
      if (this.pinchDist > 0) {
        const mid = {
          x: (pts[0]!.x + pts[1]!.x) / 2,
          y: (pts[0]!.y + pts[1]!.y) / 2,
        };
        this.zoomBy(d / this.pinchDist, mid.x, mid.y);
      }
      this.pinchDist = d;
      return;
    }

    if (this.dragArmed && !this.dragging) {
      if (
        Math.hypot(x - this.downX, y - this.downY) >= MapEngine.dragThreshold
      ) {
        this.dragging = true;
      }
    }

    if (this.dragging) {
      this.camera.panX += x - this.lastX;
      this.camera.panY += y - this.lastY;
      this.lastX = x;
      this.lastY = y;
      this.notify();
      return;
    }

    const region = this.hitTest(x, y);
    if (region !== this.hovered) {
      this.hovered = region;
      this.onRegionHover?.(region);
      this.notify();
    }
  }

  /** Whether the current gesture is still a tap (no pan started). */
  isTapGesture(): boolean {
    return this.dragArmed && !this.dragging;
  }

  handlePointerUp(id: number, x: number, y: number, wasTap?: boolean): void {
    const tap =
      wasTap ?? (this.dragArmed && !this.dragging);
    this.pointers.delete(id);
    if (this.pointers.size < 2) this.pinchDist = 0;
    if (this.pointers.size === 0) {
      this.dragging = false;
      this.dragArmed = false;
    }

    if (!tap || !this.interactive) return;

    const marker = this.hitTestMarker(x, y);
    if (marker) {
      this.onMarkerTap?.(marker);
      return;
    }

    const region = this.hitTest(x, y);
    if (!region) return;

    this.onRegionTap?.(region);

    if (this.drillDown && region.level.id !== 'localLevel') {
      this.drillDownTo(region);
      return;
    }

    if (this.selectionMode === 'none') return;
    if (this.selectionMode === 'single') {
      if (this.selected.has(region) && this.selected.size === 1) {
        this.clearSelection();
      } else {
        this.select(region);
      }
    } else {
      const next = new Set(this.selected);
      if (next.has(region)) next.delete(region);
      else next.add(region);
      this.setSelection(next);
    }
  }

  handleWheel(x: number, y: number, deltaY: number): void {
    if (!this.interactive) return;
    const factor = deltaY > 0 ? 1 / 1.15 : 1.15;
    this.zoomBy(factor, x, y);
  }

  handleDoubleClick(x: number, y: number): void {
    if (!this.interactive) return;
    this.zoomBy(1.6, x, y);
  }

  /**
   * Paints in CSS-pixel coordinates. [pixelRatio] must match the canvas
   * backing-store scale (devicePixelRatio) so drawing aligns with hit-tests.
   */
  paint(ctx: CanvasRenderingContext2D, pixelRatio = 1): void {
    const { width, height } = this.size;
    const dpr = pixelRatio > 0 ? pixelRatio : 1;

    // Clear the full device-pixel buffer, then draw in CSS pixels × dpr.
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = this.theme.background;
    ctx.fillRect(0, 0, width, height);

    const shapes = this.visibleShapes();
    const view = this.view;
    const paintCtx: MapPaintContext = {
      data: this.data,
      plane: this.plane,
      view,
      camera: this.camera,
      level: this.level,
      scope: this.scope,
      theme: this.theme,
      geometry: this.geometry,
      shapes,
      selected: this.selected,
      highlighted: this.highlighted,
      hovered: this.hovered,
      language: this.language,
    };

    const styleFn: RegionStyleBuilder =
      this.styleBuilder ??
      (this.choropleth
        ? this.choropleth.defaultStyle(this.theme)
        : (r, s) => defaultStyle(this.theme, r, s));

    // Fills
    ctx.save();
    view.apply(ctx, dpr);
    for (const shape of shapes) {
      const state = {
        isSelected: this.selected.has(shape.feature),
        isHovered: this.hovered === shape.feature,
        isHighlighted: this.highlighted.has(shape.feature),
        isFocused: false,
        value: this.choropleth?.values.get(shape.feature),
      };
      const style = styleFn(shape.feature, state);
      const path = this.geometry.pathOf(shape, this.plane);
      ctx.fillStyle = style.fill;
      ctx.fill(path, 'evenodd');
    }

    // Protected areas
    if (this.showProtectedAreas || this.level === 'localLevel') {
      for (const shape of this.data.protectedAreas) {
        if (this.scope && !paInScope(shape.feature, this.scope)) continue;
        const path = this.geometry.pathOf(shape, this.plane);
        if (this.level === 'localLevel') {
          ctx.fillStyle = this.theme.protectedAreaFill;
          ctx.fill(path, 'evenodd');
        }
        if (this.showProtectedAreas) {
          ctx.strokeStyle = this.theme.protectedAreaOverlay;
          ctx.lineWidth = 1.5 / view.scale;
          ctx.setLineDash([4 / view.scale, 3 / view.scale]);
          ctx.stroke(path);
          ctx.setLineDash([]);
        }
      }
    }

    // Borders
    ctx.strokeStyle = this.theme.borderColor;
    ctx.lineWidth = this.theme.borderWidth / view.scale;
    ctx.lineJoin = 'round';
    for (const shape of shapes) {
      ctx.stroke(this.geometry.pathOf(shape, this.plane));
    }

    // Outline of scope / country
    ctx.strokeStyle = this.theme.outlineColor;
    ctx.lineWidth = this.theme.outlineWidth / view.scale;
    if (this.scope) {
      ctx.stroke(this.geometry.pathOf(this.data.shapeOf(this.scope), this.plane));
    } else {
      for (const s of this.data.provinces) {
        ctx.stroke(this.geometry.pathOf(s, this.plane));
      }
    }

    // Highlights
    for (const shape of shapes) {
      if (!this.highlighted.has(shape.feature) && !this.selected.has(shape.feature)) {
        continue;
      }
      const state = {
        isSelected: this.selected.has(shape.feature),
        isHovered: false,
        isHighlighted: this.highlighted.has(shape.feature),
        isFocused: false,
      };
      const style = styleFn(shape.feature, state);
      if (style.outline) {
        ctx.strokeStyle = style.outline;
        ctx.lineWidth = (style.outlineWidth ?? 2) / view.scale;
        ctx.stroke(this.geometry.pathOf(shape, this.plane));
      }
    }

    for (const layer of this.extraLayers) {
      if (!layer.screenSpace) layer.paint(ctx, paintCtx);
    }

    // Dot markers (plane space for positioning, radius in screen px)
    for (const marker of this.markers) {
      if (marker.child) continue;
      const p = this.plane.project(marker.point);
      const r = (marker.radius ?? 4) / view.scale;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fillStyle = marker.color ?? this.theme.selectedOutline;
      ctx.fill();
    }

    ctx.restore();

    // Labels (screen space)
    const mode = this.labelMode;
    if (mode !== 'none') {
      const labels = shapes
        .map((shape) => {
          const text = labelText(
            shape.feature,
            mode,
            this.language,
            this.labelBuilder,
          );
          if (!text) return null;
          const anchor = this.geometry.labelAnchor(shape, this.plane);
          const screen = view.toScreen(anchor.x, anchor.y);
          return { text, screen, area: anchor.area, distance: anchor.distance };
        })
        .filter(Boolean)
        .sort((a, b) => b!.area - a!.area) as {
        text: string;
        screen: { x: number; y: number };
        area: number;
        distance: number;
      }[];

      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const fontSize = Math.max(9, Math.min(14, 11 * Math.sqrt(view.scale)));
      ctx.font = `${fontSize}px system-ui, sans-serif`;
      const placed: { x: number; y: number; w: number; h: number }[] = [];

      for (const label of labels) {
        const lines = label.text.split('\n');
        const metrics = lines.map((l) => ctx.measureText(l).width);
        const w = Math.max(...metrics);
        const h = lines.length * fontSize * 1.2;
        if (label.distance * view.scale < w * 0.35) continue;
        const box = {
          x: label.screen.x - w / 2,
          y: label.screen.y - h / 2,
          w,
          h,
        };
        if (placed.some((p) => overlaps(p, box))) continue;
        placed.push(box);

        ctx.lineWidth = 3;
        ctx.strokeStyle = this.theme.labelHaloColor;
        ctx.fillStyle = this.theme.labelColor;
        lines.forEach((line, i) => {
          const y =
            label.screen.y + (i - (lines.length - 1) / 2) * fontSize * 1.2;
          ctx.strokeText(line, label.screen.x, y);
          ctx.fillText(line, label.screen.x, y);
        });
      }
      ctx.restore();
    }

    for (const layer of this.extraLayers) {
      if (layer.screenSpace) {
        ctx.save();
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        layer.paint(ctx, paintCtx);
        ctx.restore();
      }
    }
  }

  toPngBlob(pixelRatio = 2): Promise<Blob> {
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.floor(this.size.width * pixelRatio));
    canvas.height = Math.max(1, Math.floor(this.size.height * pixelRatio));
    const ctx = canvas.getContext('2d')!;
    this.paint(ctx, pixelRatio);
    return new Promise((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png');
    });
  }

  private notify(): void {
    this.onChange?.();
  }
}

function inScope(region: Region, scope: Region): boolean {
  if (scope.level.id === 'province') {
    return region.province.code === scope.code;
  }
  if (scope.level.id === 'district') {
    if (region.level.id === 'localLevel') {
      return (region as LocalLevel).district.code === scope.code;
    }
    return region.code === scope.code;
  }
  return region.code === scope.code;
}

function paInScope(
  area: { districts: District[] },
  scope: Region,
): boolean {
  if (scope.level.id === 'province') {
    return area.districts.some((d) => d.province.code === scope.code);
  }
  if (scope.level.id === 'district') {
    return area.districts.some((d) => d.code === scope.code);
  }
  return true;
}

function dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

function overlaps(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
): boolean {
  return !(
    a.x + a.w < b.x ||
    b.x + b.w < a.x ||
    a.y + a.h < b.y ||
    b.y + b.h < a.y
  );
}

export { AL as AdminLevelConst };
