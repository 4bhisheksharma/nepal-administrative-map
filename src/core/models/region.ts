import { LocalizedName } from '../i18n/localized-name.js';
import type { MapLanguage } from '../i18n/map-language.js';

/** A level of Nepal's administrative hierarchy. */
export const AdminLevel = {
  province: {
    id: 'province' as const,
    label: new LocalizedName('Province', 'प्रदेश'),
  },
  district: {
    id: 'district' as const,
    label: new LocalizedName('District', 'जिल्ला'),
  },
  localLevel: {
    id: 'localLevel' as const,
    label: new LocalizedName('Local Level', 'स्थानीय तह'),
  },
} as const;

export type AdminLevelId = 'province' | 'district' | 'localLevel';
export type AdminLevel = (typeof AdminLevel)[AdminLevelId];

export const AdminLevelValues: AdminLevel[] = [
  AdminLevel.province,
  AdminLevel.district,
  AdminLevel.localLevel,
];

/** Kind of local level. */
export const LocalLevelType = {
  metropolitan: {
    id: 'metropolitan' as const,
    label: new LocalizedName('Metropolitan City', 'महानगरपालिका'),
  },
  subMetropolitan: {
    id: 'subMetropolitan' as const,
    label: new LocalizedName('Sub-Metropolitan City', 'उपमहानगरपालिका'),
  },
  municipality: {
    id: 'municipality' as const,
    label: new LocalizedName('Municipality', 'नगरपालिका'),
  },
  ruralMunicipality: {
    id: 'ruralMunicipality' as const,
    label: new LocalizedName('Rural Municipality', 'गाउँपालिका'),
  },
} as const;

export type LocalLevelTypeId = keyof typeof LocalLevelType;
export type LocalLevelType = (typeof LocalLevelType)[LocalLevelTypeId];

/** Kind of protected area. */
export const ProtectedAreaType = {
  nationalPark: {
    id: 'nationalPark' as const,
    label: new LocalizedName('National Park', 'राष्ट्रिय निकुञ्ज'),
  },
  wildlifeReserve: {
    id: 'wildlifeReserve' as const,
    label: new LocalizedName('Wildlife Reserve', 'वन्यजन्तु आरक्ष'),
  },
  huntingReserve: {
    id: 'huntingReserve' as const,
    label: new LocalizedName('Hunting Reserve', 'शिकार आरक्ष'),
  },
  watershedAndWildlifeReserve: {
    id: 'watershedAndWildlifeReserve' as const,
    label: new LocalizedName(
      'Watershed and Wildlife Reserve',
      'जलाधार तथा वन्यजन्तु आरक्ष',
    ),
  },
  developmentArea: {
    id: 'developmentArea' as const,
    label: new LocalizedName('Development Area', 'विकास क्षेत्र'),
  },
} as const;

export type ProtectedAreaTypeId = keyof typeof ProtectedAreaType;
export type ProtectedAreaType =
  (typeof ProtectedAreaType)[ProtectedAreaTypeId];

export type { LocalizedName };

/** A province, district or local level. */
export interface Region {
  readonly code: string;
  readonly name: LocalizedName;
  readonly level: AdminLevel;
  readonly province: Province;
  fullName(language: MapLanguage): string;
}

export interface Province extends Region {
  readonly number: number;
  readonly districts: District[];
  readonly localLevels: LocalLevel[];
}

export interface District extends Region {
  readonly localLevels: LocalLevel[];
}

export interface LocalLevel extends Region {
  readonly type: LocalLevelType;
  readonly district: District;
}

export interface ProtectedArea {
  readonly code: string;
  readonly name: LocalizedName;
  readonly type: ProtectedAreaType;
  readonly districts: District[];
  fullName(language: MapLanguage): string;
}
