import type { CSSProperties } from 'react';
import type { MapLanguage } from '../core/i18n/map-language.js';
import { NepalMapStrings } from '../core/i18n/nepal-map-strings.js';
import type { District, Region } from '../core/models/region.js';
import {
  NepalMapController,
  useNepalMapControllerState,
} from './controller.js';

export interface NepalMapBreadcrumbProps {
  controller: NepalMapController;
  language?: MapLanguage;
  strings?: NepalMapStrings;
  className?: string;
  style?: CSSProperties;
}

/** Nepal › Province › District breadcrumb; taps call controller.drillTo. */
export function NepalMapBreadcrumb({
  controller,
  language: languageProp,
  strings,
  className,
  style,
}: NepalMapBreadcrumbProps) {
  const { level, scope, language: ctrlLang } = useNepalMapControllerState(
    controller,
  );
  const language = languageProp ?? ctrlLang ?? 'en';
  const ui = strings ?? NepalMapStrings.of(language);

  const crumbs: { label: string; target: Region | undefined }[] = [
    { label: ui.country, target: undefined },
  ];

  if (scope) {
    if (scope.level.id === 'district') {
      const district = scope as District;
      crumbs.push({
        label: district.province.fullName(language),
        target: district.province,
      });
      crumbs.push({
        label: district.fullName(language),
        target: district,
      });
    } else if (scope.level.id === 'province') {
      crumbs.push({
        label: scope.fullName(language),
        target: scope,
      });
      if (level === 'localLevel') {
        // unusual but possible
      }
    }
  }

  return (
    <nav
      className={className}
      style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center', ...style }}
      aria-label="Map breadcrumb"
    >
      {crumbs.map((c, i) => {
        const isLast = i === crumbs.length - 1;
        return (
          <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            {i > 0 ? <span style={{ opacity: 0.5 }}>›</span> : null}
            {isLast ? (
              <span style={{ fontWeight: 600 }}>{c.label}</span>
            ) : (
              <button
                type="button"
                onClick={() => void controller.drillTo(c.target)}
                style={linkStyle}
              >
                {c.label}
              </button>
            )}
          </span>
        );
      })}
    </nav>
  );
}

const linkStyle: CSSProperties = {
  background: 'none',
  border: 'none',
  padding: 0,
  color: '#3949ab',
  cursor: 'pointer',
  font: 'inherit',
  textDecoration: 'underline',
};
