export {
  AdminLevel,
  AdminLevelValues,
  LocalLevelType,
  ProtectedAreaType,
} from './models/region.js';
export type {
  AdminLevelId,
  LocalLevelTypeId,
  ProtectedAreaTypeId,
  Region,
} from './models/region.js';

export { LocalizedName } from './i18n/localized-name.js';
export { MapLanguage } from './i18n/map-language.js';
export type { MapLanguage as MapLanguageCode } from './i18n/map-language.js';
export { Devanagari } from './i18n/devanagari.js';
export {
  NepalNumberFormat,
  NumberGrouping,
} from './i18n/nepal-number-format.js';
export type { NumberGrouping as NumberGroupingMode } from './i18n/nepal-number-format.js';
export { NepalMapStrings } from './i18n/nepal-map-strings.js';

export { LatLng } from './geometry/lat-lng.js';
export { Bounds } from './geometry/bounds.js';
export { WebMercator } from './geometry/projection.js';
export {
  earthRadiusMeters,
  geodesicArea,
  polygonArea,
  polygonContains,
  ringCentroid,
  ringSignedArea,
} from './geometry/polygon.js';
export { polylabel } from './geometry/polylabel.js';
export { SpatialIndex } from './geometry/spatial-index.js';

export { Nepal } from './gazetteer/nepal.js';
export {
  Province,
  District,
  LocalLevel,
  ProtectedArea,
  provinces,
  districts,
  localLevels,
  protectedAreas,
  regionAliases,
} from './gazetteer/catalog.js';
export type {
  ProvinceKey,
  DistrictKey,
  LocalLevelKey,
  ProtectedAreaKey,
} from './gazetteer/catalog.js';

export { RegionSearch } from './gazetteer/search.js';

export { Topology } from './topojson/topology.js';
export type { TopoGeometry } from './topojson/topology.js';

export { MapDataSource, AssetMapDataSource } from './loader/map-data-source.js';
export { MapShape, NepalMapData } from './loader/nepal-map-data.js';
