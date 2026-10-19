import type { MapLanguage } from './map-language.js';

/** A name in both English and Nepali (Devanagari). */
export class LocalizedName {
  constructor(
    readonly en: string,
    readonly ne: string,
  ) {}

  of(language: MapLanguage): string {
    return language === 'ne' ? this.ne : this.en;
  }

  equals(other: LocalizedName): boolean {
    return this.en === other.en && this.ne === other.ne;
  }

  toString(): string {
    return `${this.en} / ${this.ne}`;
  }
}
