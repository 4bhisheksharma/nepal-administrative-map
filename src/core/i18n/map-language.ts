/** The language the map shows names, labels and numbers in. */
export type MapLanguage = 'en' | 'ne';

export const MapLanguage = {
  en: 'en' as const,
  ne: 'ne' as const,
  fromLocaleCode(languageCode: string | null | undefined): MapLanguage {
    return languageCode?.toLowerCase() === 'ne' ? 'ne' : 'en';
  },
};
