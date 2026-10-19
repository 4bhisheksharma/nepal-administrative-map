/**
 * Value + type exports with the same Flutter-style names.
 * Consumers can write both `Province.gandaki` and `region: Province`.
 */
import type {
  District as DistrictInterface,
  LocalLevel as LocalLevelInterface,
  ProtectedArea as ProtectedAreaInterface,
  Province as ProvinceInterface,
} from '../models/region.js';
import {
  District as DistrictMap,
  LocalLevel as LocalLevelMap,
  ProtectedArea as ProtectedAreaMap,
  Province as ProvinceMap,
} from './regions.generated.js';

export const Province = ProvinceMap;
export type Province = ProvinceInterface;

export const District = DistrictMap;
export type District = DistrictInterface;

export const LocalLevel = LocalLevelMap;
export type LocalLevel = LocalLevelInterface;

export const ProtectedArea = ProtectedAreaMap;
export type ProtectedArea = ProtectedAreaInterface;

export type { ProvinceKey, DistrictKey, LocalLevelKey, ProtectedAreaKey } from './regions.generated.js';
export {
  provinces,
  districts,
  localLevels,
  protectedAreas,
  regionAliases,
  regionsByCode,
  protectedAreasByCode,
} from './regions.generated.js';
