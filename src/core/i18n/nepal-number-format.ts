import type { MapLanguage } from './map-language.js';

/** How digits are grouped with commas. */
export type NumberGrouping = 'nepali' | 'international' | 'none';

export const NumberGrouping = {
  nepali: 'nepali' as const,
  international: 'international' as const,
  none: 'none' as const,
};

const LATIN = '0123456789';
const DEVANAGARI = '०१२३४५६७८९';

function mapDigits(input: string, from: string, to: string): string {
  let out = '';
  for (const ch of input) {
    const i = from.indexOf(ch);
    out += i < 0 ? ch : to[i];
  }
  return out;
}

function groupBy(digits: string, size: number): string {
  const first = digits.length % size;
  const parts: string[] = [];
  if (first > 0) parts.push(digits.slice(0, first));
  for (let i = first; i < digits.length; i += size) {
    parts.push(digits.slice(i, i + size));
  }
  return parts.join(',');
}

function group(digits: string, grouping: NumberGrouping): string {
  if (grouping === 'none' || digits.length <= 3) return digits;
  if (grouping === 'international') return groupBy(digits, 3);
  const head = digits.slice(0, digits.length - 3);
  return `${groupBy(head, 2)},${digits.slice(digits.length - 3)}`;
}

/** Formats numbers in English or Nepali without depending on Intl. */
export const NepalNumberFormat = {
  toDevanagariDigits(input: string): string {
    return mapDigits(input, LATIN, DEVANAGARI);
  },

  toLatinDigits(input: string): string {
    return mapDigits(input, DEVANAGARI, LATIN);
  },

  format(
    value: number,
    options: {
      language?: MapLanguage;
      grouping?: NumberGrouping;
      decimals?: number;
    } = {},
  ): string {
    const language = options.language ?? 'en';
    if (!Number.isFinite(value)) return String(value);
    const places =
      options.decimals ?? (value === Math.trunc(value) ? 0 : 2);
    const fixed = Math.abs(value).toFixed(places);
    const dot = fixed.indexOf('.');
    const whole = dot < 0 ? fixed : fixed.slice(0, dot);
    const fraction = dot < 0 ? '' : fixed.slice(dot);
    const grouped = group(
      whole,
      options.grouping ??
        (language === 'ne' ? 'nepali' : 'international'),
    );
    const negative = value < 0 && Number.parseFloat(fixed) !== 0;
    const result = `${negative ? '-' : ''}${grouped}${fraction}`;
    return language === 'ne'
      ? NepalNumberFormat.toDevanagariDigits(result)
      : result;
  },
};
