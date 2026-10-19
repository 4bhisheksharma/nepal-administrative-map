import { useCallback, useMemo, useSyncExternalStore } from 'react';
import type { MapLanguage } from '../core/i18n/map-language.js';
import type { AdminLevelId, Region } from '../core/models/region.js';
import type { MapEngine } from '../canvas/map-engine.js';

type Listener = () => void;

export interface NepalMapControllerSnapshot {
  level: AdminLevelId;
  scope: Region | undefined;
  language: MapLanguage | undefined;
  selection: Set<Region>;
  isAttached: boolean;
  version: number;
}

/** Imperative handle to drive a NepalMap from code. */
export class NepalMapController {
  private engine: MapEngine | null = null;
  private listeners = new Set<Listener>();
  private _language: MapLanguage | undefined;
  private version = 0;
  private snapshot: NepalMapControllerSnapshot = {
    level: 'province',
    scope: undefined,
    language: undefined,
    selection: new Set(),
    isAttached: false,
    version: 0,
  };

  get isAttached(): boolean {
    return this.engine !== null;
  }

  get language(): MapLanguage | undefined {
    return this._language ?? this.engine?.language;
  }

  set language(value: MapLanguage | undefined) {
    this._language = value;
    if (this.engine && value) {
      this.engine.language = value;
      this.engine.labelMode = value === 'ne' ? 'ne' : 'en';
      this.engine.onChange?.();
    }
    this.emit();
  }

  get level(): AdminLevelId {
    return this.engine?.level ?? 'province';
  }

  get scope(): Region | undefined {
    return this.engine?.scope;
  }

  get selection(): Set<Region> {
    return this.engine?.selected ?? new Set();
  }

  get highlighted(): Set<Region> {
    return this.engine?.highlighted ?? new Set();
  }

  getSnapshot(): NepalMapControllerSnapshot {
    return this.snapshot;
  }

  /** @internal */
  attach(engine: MapEngine): void {
    this.engine = engine;
    if (this._language) {
      engine.language = this._language;
      engine.labelMode = this._language === 'ne' ? 'ne' : 'en';
    }
    this.emit();
  }

  /** @internal */
  detach(engine: MapEngine): void {
    if (this.engine === engine) this.engine = null;
    this.emit();
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(): void {
    this.version += 1;
    this.snapshot = {
      level: this.level,
      scope: this.scope,
      language: this.language,
      selection: this.selection,
      isAttached: this.isAttached,
      version: this.version,
    };
    for (const l of this.listeners) l();
  }

  notify(): void {
    this.emit();
  }

  select(region: Region): void {
    this.engine?.select(region);
    this.emit();
  }

  addToSelection(region: Region): void {
    if (!this.engine) return;
    const next = new Set(this.engine.selected);
    next.add(region);
    this.engine.setSelection(next);
    this.emit();
  }

  deselect(region: Region): void {
    if (!this.engine) return;
    const next = new Set(this.engine.selected);
    next.delete(region);
    this.engine.setSelection(next);
    this.emit();
  }

  setSelection(regions: Iterable<Region>): void {
    this.engine?.setSelection(regions);
    this.emit();
  }

  clearSelection(): void {
    this.engine?.clearSelection();
    this.emit();
  }

  highlight(regions: Iterable<Region>): void {
    this.engine?.highlight(regions);
    this.emit();
  }

  clearHighlight(): void {
    this.engine?.clearHighlight();
    this.emit();
  }

  async zoomTo(region: Region, animate = true): Promise<void> {
    await this.engine?.zoomTo(region, animate);
    this.emit();
  }

  resetView(): void {
    this.engine?.resetView();
    this.emit();
  }

  zoomIn(): void {
    this.engine?.zoomIn();
    this.emit();
  }

  zoomOut(): void {
    this.engine?.zoomOut();
    this.emit();
  }

  async drillDown(region: Region): Promise<void> {
    this.engine?.drillDownTo(region);
    this.emit();
  }

  drillUp(): void {
    this.engine?.drillUp();
    this.emit();
  }

  async drillTo(region: Region | undefined): Promise<void> {
    this.engine?.drillTo(region);
    this.emit();
  }

  async toPngBlob(pixelRatio = 2): Promise<Blob> {
    if (!this.engine) throw new Error('Controller is not attached to a map');
    return this.engine.toPngBlob(pixelRatio);
  }
}

/** Creates a stable NepalMapController for the component lifetime. */
export function useNepalMapController(): NepalMapController {
  return useMemo(() => new NepalMapController(), []);
}

/** Subscribe to controller changes (level, scope, selection, language). */
export function useNepalMapControllerState(
  controller: NepalMapController,
): NepalMapControllerSnapshot {
  const subscribe = useCallback(
    (cb: () => void) => controller.subscribe(cb),
    [controller],
  );
  const getSnapshot = useCallback(
    () => controller.getSnapshot(),
    [controller],
  );
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
