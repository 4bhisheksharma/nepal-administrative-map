/** React map components and core API. */
export * from './core/index.js';
export * from './react/index.js';

export { Choropleth } from './canvas/choropleth.js';
export type {
  LegendAlignment,
  ValueFormatter,
} from './canvas/choropleth.js';
export {
  ColorScale,
  SequentialScale,
  DivergingScale,
  ThresholdScale,
  CategoricalScale,
  lerpOklab,
} from './canvas/color-scale.js';
export type { ScaleDomain } from './canvas/color-scale.js';
export {
  lightTheme,
  darkTheme,
  defaultStyle,
} from './canvas/theme.js';
export type {
  NepalMapTheme,
  RegionStyle,
  RegionState,
  RegionStyleBuilder,
} from './canvas/theme.js';
export {
  MapEngine,
} from './canvas/map-engine.js';
export type {
  MapMarker,
  MapLayer,
  MapPaintContext,
  SelectionMode,
  LabelMode,
  CameraState,
} from './canvas/map-engine.js';
export { MapPlane, ViewTransform } from './canvas/map-plane.js';
export { GeometryCache } from './canvas/geometry-cache.js';
