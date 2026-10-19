import { useMemo, useState, type CSSProperties } from 'react';
import type { MapLanguage } from '../core/i18n/map-language.js';
import { NepalMapStrings } from '../core/i18n/nepal-map-strings.js';
import { Nepal } from '../core/gazetteer/nepal.js';
import type { Region } from '../core/models/region.js';
import { NepalMapController } from './controller.js';

export interface NepalMapSearchFieldProps {
  controller?: NepalMapController;
  language?: MapLanguage;
  strings?: NepalMapStrings;
  limit?: number;
  onSelected?: (region: Region) => void;
  className?: string;
  style?: CSSProperties;
}

/** Autocomplete search that highlights and zooms to a region. */
export function NepalMapSearchField({
  controller,
  language = 'en',
  strings,
  limit = 8,
  onSelected,
  className,
  style,
}: NepalMapSearchFieldProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ui = strings ?? NepalMapStrings.of(language);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    return Nepal.search(query, { limit });
  }, [query, limit]);

  const pick = (region: Region) => {
    setQuery(region.fullName(language));
    setOpen(false);
    controller?.highlight([region]);
    void controller?.zoomTo(region);
    onSelected?.(region);
  };

  return (
    <div className={className} style={{ position: 'relative', ...style }}>
      <input
        type="search"
        value={query}
        placeholder={ui.searchHint}
        aria-label={ui.searchHint}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          // Delay so clicks on results register
          setTimeout(() => setOpen(false), 150);
        }}
        style={inputStyle}
      />
      {open && results.length > 0 ? (
        <ul style={listStyle} role="listbox">
          {results.map((r) => (
            <li key={r.code}>
              <button
                type="button"
                style={itemStyle}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(r)}
              >
                <span style={{ fontWeight: 600 }}>{r.fullName(language)}</span>
                <span style={{ opacity: 0.6, marginLeft: 8, fontSize: 12 }}>
                  {r.level.label.of(language)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

const inputStyle: CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '8px 12px',
  border: '1px solid #cfd8dc',
  borderRadius: 8,
  font: 'inherit',
};

const listStyle: CSSProperties = {
  position: 'absolute',
  zIndex: 20,
  left: 0,
  right: 0,
  top: '100%',
  margin: '4px 0 0',
  padding: 0,
  listStyle: 'none',
  background: '#fff',
  border: '1px solid #cfd8dc',
  borderRadius: 8,
  boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
  maxHeight: 280,
  overflow: 'auto',
};

const itemStyle: CSSProperties = {
  display: 'flex',
  width: '100%',
  alignItems: 'baseline',
  justifyContent: 'space-between',
  padding: '8px 12px',
  border: 'none',
  background: 'transparent',
  textAlign: 'left',
  cursor: 'pointer',
  font: 'inherit',
};
