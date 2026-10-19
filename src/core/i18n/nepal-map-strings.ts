import type { MapLanguage } from './map-language.js';

/** The few UI strings the package shows itself. */
export class NepalMapStrings {
  constructor(
    readonly country: string,
    readonly back: string,
    readonly noData: string,
    readonly searchHint: string,
  ) {}

  static readonly en = new NepalMapStrings(
    'Nepal',
    'Back',
    'No data',
    'Search places',
  );

  static readonly ne = new NepalMapStrings(
    'नेपाल',
    'पछाडि',
    'डाटा उपलब्ध छैन',
    'ठाउँ खोज्नुहोस्',
  );

  static of(language: MapLanguage): NepalMapStrings {
    return language === 'ne' ? NepalMapStrings.ne : NepalMapStrings.en;
  }

  copyWith(partial: Partial<{
    country: string;
    back: string;
    noData: string;
    searchHint: string;
  }>): NepalMapStrings {
    return new NepalMapStrings(
      partial.country ?? this.country,
      partial.back ?? this.back,
      partial.noData ?? this.noData,
      partial.searchHint ?? this.searchHint,
    );
  }
}
