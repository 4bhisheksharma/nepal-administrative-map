/** Text helpers for matching Devanagari input. */
export const Devanagari = {
  normalize(input: string): string {
    return input
      .replaceAll('ँ', 'ं')
      .replace(/[़‌‍]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  },

  contains(input: string): boolean {
    for (const ch of input) {
      const code = ch.codePointAt(0)!;
      if (code >= 0x0900 && code <= 0x097f) return true;
    }
    return false;
  },
};
