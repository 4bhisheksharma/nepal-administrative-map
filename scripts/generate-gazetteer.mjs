#!/usr/bin/env node
/**
 * Generates src/core/gazetteer/regions.generated.ts from the Flutter package's
 * names.csv. Identifiers match the Dart enum names (camelCase).
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const csvPath = join(
  root,
  '..',
  'nepal_administrative_map',
  'tool',
  'source',
  'names.csv',
);
const outPath = join(root, 'src', 'core', 'gazetteer', 'regions.generated.ts');

if (!existsSync(csvPath)) {
  if (existsSync(outPath)) {
    console.log(`names.csv missing; keeping existing ${outPath}`);
    process.exit(0);
  }
  console.error(`Missing ${csvPath} and no generated gazetteer at ${outPath}`);
  process.exit(1);
}

const reserved = new Set([
  'abstract', 'as', 'assert', 'async', 'await', 'base', 'break', 'case',
  'catch', 'class', 'const', 'continue', 'default', 'do', 'else', 'enum',
  'export', 'extends', 'false', 'finally', 'for', 'function', 'if',
  'implements', 'import', 'in', 'instanceof', 'interface', 'let', 'new',
  'null', 'package', 'private', 'protected', 'public', 'return', 'static',
  'super', 'switch', 'this', 'throw', 'true', 'try', 'typeof', 'var', 'void',
  'while', 'with', 'yield', 'values', 'name', 'constructor', 'prototype',
]);

function camelCase(s) {
  const words = s
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((w) => w.toLowerCase());
  let id =
    words[0] +
    words
      .slice(1)
      .map((w) => w[0].toUpperCase() + w.slice(1))
      .join('');
  if (/^[0-9]/.test(id)) id = `n${id}`;
  return id;
}

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = splitCsvLine(lines[0]);
  return lines.slice(1).filter(Boolean).map((line) => {
    const cols = splitCsvLine(line);
    const row = {};
    headers.forEach((h, i) => {
      row[h] = cols[i] ?? '';
    });
    return row;
  });
}

function splitCsvLine(line) {
  const out = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

function lit(s) {
  return JSON.stringify(s);
}

function identifiers(rows) {
  const byCode = Object.fromEntries(rows.map((r) => [r.code, r]));
  const levels = ['province', 'district', 'local_level', 'protected_area'];
  const ids = {};
  for (const level of levels) {
    const group = rows.filter((r) => r.level === level);
    const counts = {};
    for (const r of group) {
      const base = camelCase(r.name_en);
      counts[base] = (counts[base] ?? 0) + 1;
    }
    const seen = new Set();
    for (const r of group) {
      let id = camelCase(r.name_en);
      if (counts[id] > 1 || reserved.has(id)) {
        const parent = byCode[r.parent_code];
        if (!parent) {
          throw new Error(`Cannot disambiguate "${r.name_en}" (${r.code})`);
        }
        const suffix = camelCase(parent.name_en);
        id += suffix[0].toUpperCase() + suffix.slice(1);
      }
      if (seen.has(id)) {
        throw new Error(`Duplicate identifier "${id}" for ${r.code}`);
      }
      seen.add(id);
      ids[r.code] = id;
    }
  }
  return ids;
}

const csv = readFileSync(csvPath, 'utf8');
const rows = parseCsv(csv);
const ids = identifiers(rows);
const byCode = Object.fromEntries(rows.map((r) => [r.code, r]));

const provinces = rows.filter((r) => r.level === 'province');
const districts = rows.filter((r) => r.level === 'district');
const localLevels = rows.filter((r) => r.level === 'local_level');
const protectedAreas = rows.filter((r) => r.level === 'protected_area');

function neName(r) {
  return r.name_ne || r.name_en;
}

function aliasesOf(r) {
  return r.aliases
    ? r.aliases.split(';').map((a) => a.trim()).filter(Boolean)
    : [];
}

/** District codes for a protected area from source_keys DISTRICT|name. */
function paDistricts(r) {
  if (!r.source_keys) return [];
  const districtCodes = new Set();
  for (const key of r.source_keys.split(';')) {
    const distName = key.split('|')[0]?.trim();
    if (!distName) continue;
    for (const d of districts) {
      const keys = (d.source_keys || '').split(';').map((k) => k.trim());
      if (keys.includes(distName) || d.name_en.toUpperCase().replace(/\s+/g, '_') === distName) {
        districtCodes.add(d.code);
      }
      // OKNP uses uppercase district names in source_keys
      if (keys.some((k) => k.toUpperCase() === distName.toUpperCase())) {
        districtCodes.add(d.code);
      }
    }
    // Match by uppercase name without spaces
    for (const d of districts) {
      const up = d.name_en.toUpperCase().replace(/\s+/g, '_');
      const upSpace = d.name_en.toUpperCase();
      if (distName === up || distName === upSpace || distName === d.name_en.toUpperCase()) {
        districtCodes.add(d.code);
      }
    }
  }
  return [...districtCodes];
}

let out = `/* GENERATED by scripts/generate-gazetteer.mjs from names.csv. Do not edit. */
/* Boundary data: OKNP LocalBoundaries, CC BY 4.0 (see DATA_LICENSE.md). */

import {
  AdminLevel,
  LocalLevelType,
  ProtectedAreaType,
  type District as DistrictModel,
  type LocalLevel as LocalLevelModel,
  type LocalizedName,
  type ProtectedArea as ProtectedAreaModel,
  type Province as ProvinceModel,
  type Region,
} from '../models/region.js';
import { LocalizedName as LN } from '../i18n/localized-name.js';

function ln(en: string, ne: string): LocalizedName {
  return new LN(en, ne);
}

`;

// Provinces
out += `export const Province = {\n`;
provinces.forEach((r, i) => {
  const id = ids[r.code];
  out += `  ${id}: {\n`;
  out += `    code: ${lit(r.code)},\n`;
  out += `    number: ${i + 1},\n`;
  out += `    name: ln(${lit(r.name_en)}, ${lit(neName(r))}),\n`;
  out += `    level: AdminLevel.province,\n`;
  out += `    get province(): ProvinceModel { return Province.${id}; },\n`;
  out += `    get districts(): DistrictModel[] { return _districtsByProvince[${lit(r.code)}]; },\n`;
  out += `    get localLevels(): LocalLevelModel[] {\n`;
  out += `      return this.districts.flatMap((d) => d.localLevels);\n`;
  out += `    },\n`;
  out += `    fullName(language) {\n`;
  out += `      return \`\${this.name.of(language)} \${AdminLevel.province.label.of(language)}\`;\n`;
  out += `    },\n`;
  out += `  } as ProvinceModel,\n`;
});
out += `} as const;\n\n`;
out += `export type ProvinceKey = keyof typeof Province;\n`;
out += `export const provinces: ProvinceModel[] = Object.values(Province);\n\n`;

// Districts
out += `export const District = {\n`;
for (const r of districts) {
  const id = ids[r.code];
  const parentId = ids[r.parent_code];
  out += `  ${id}: {\n`;
  out += `    code: ${lit(r.code)},\n`;
  out += `    name: ln(${lit(r.name_en)}, ${lit(neName(r))}),\n`;
  out += `    level: AdminLevel.district,\n`;
  out += `    province: null as unknown as ProvinceModel,\n`;
  out += `    get localLevels(): LocalLevelModel[] { return _localLevelsByDistrict[${lit(r.code)}]; },\n`;
  out += `    fullName(language) {\n`;
  out += `      return \`\${this.name.of(language)} \${AdminLevel.district.label.of(language)}\`;\n`;
  out += `    },\n`;
  out += `  } as DistrictModel,\n`;
  // We'll wire province after
}
out += `} as const;\n\n`;
out += `export type DistrictKey = keyof typeof District;\n`;
out += `export const districts: DistrictModel[] = Object.values(District);\n\n`;

// Wire province refs
out += `// Wire district → province\n`;
for (const r of districts) {
  const id = ids[r.code];
  const parentId = ids[r.parent_code];
  out += `(District.${id} as { province: ProvinceModel }).province = Province.${parentId};\n`;
}
out += `\n`;

// Local levels
out += `export const LocalLevel = {\n`;
for (const r of localLevels) {
  const id = ids[r.code];
  const type = r.type || 'municipality';
  out += `  ${id}: {\n`;
  out += `    code: ${lit(r.code)},\n`;
  out += `    name: ln(${lit(r.name_en)}, ${lit(neName(r))}),\n`;
  out += `    level: AdminLevel.localLevel,\n`;
  out += `    type: LocalLevelType.${type},\n`;
  out += `    district: null as unknown as DistrictModel,\n`;
  out += `    get province(): ProvinceModel { return this.district.province; },\n`;
  out += `    fullName(language) {\n`;
  out += `      return \`\${this.name.of(language)} \${this.type.label.of(language)}\`;\n`;
  out += `    },\n`;
  out += `  } as LocalLevelModel,\n`;
}
out += `} as const;\n\n`;
out += `export type LocalLevelKey = keyof typeof LocalLevel;\n`;
out += `export const localLevels: LocalLevelModel[] = Object.values(LocalLevel);\n\n`;

out += `// Wire local level → district\n`;
for (const r of localLevels) {
  const id = ids[r.code];
  const parentId = ids[r.parent_code];
  out += `(LocalLevel.${id} as { district: DistrictModel }).district = District.${parentId};\n`;
}
out += `\n`;

// Protected areas
out += `export const ProtectedArea = {\n`;
for (const r of protectedAreas) {
  const id = ids[r.code];
  const type = r.type || 'nationalPark';
  const distCodes = paDistricts(r);
  out += `  ${id}: {\n`;
  out += `    code: ${lit(r.code)},\n`;
  out += `    name: ln(${lit(r.name_en)}, ${lit(neName(r))}),\n`;
  out += `    type: ProtectedAreaType.${type},\n`;
  out += `    get districts(): DistrictModel[] {\n`;
  out += `      return [${distCodes.map((c) => `District.${ids[c]}`).join(', ')}];\n`;
  out += `    },\n`;
  out += `    fullName(language) {\n`;
  out += `      return \`\${this.name.of(language)} \${this.type.label.of(language)}\`;\n`;
  out += `    },\n`;
  out += `  } as ProtectedAreaModel,\n`;
}
out += `} as const;\n\n`;
out += `export type ProtectedAreaKey = keyof typeof ProtectedArea;\n`;
out += `export const protectedAreas: ProtectedAreaModel[] = Object.values(ProtectedArea);\n\n`;

// Hierarchy maps
out += `const _districtsByProvince: Record<string, DistrictModel[]> = {\n`;
for (const p of provinces) {
  const kids = districts.filter((d) => d.parent_code === p.code);
  out += `  ${lit(p.code)}: [${kids.map((d) => `District.${ids[d.code]}`).join(', ')}],\n`;
}
out += `};\n\n`;

out += `const _localLevelsByDistrict: Record<string, LocalLevelModel[]> = {\n`;
for (const d of districts) {
  const kids = localLevels.filter((l) => l.parent_code === d.code);
  out += `  ${lit(d.code)}: [${kids.map((l) => `LocalLevel.${ids[l.code]}`).join(', ')}],\n`;
}
out += `};\n\n`;

// Aliases
out += `export const regionAliases: Record<string, string[]> = {\n`;
for (const r of rows) {
  const a = aliasesOf(r);
  if (a.length) {
    out += `  ${lit(r.code)}: [${a.map(lit).join(', ')}],\n`;
  }
}
out += `};\n\n`;

out += `export const regionsByCode: Record<string, Region> = {\n`;
out += `  ...Object.fromEntries(provinces.map((r) => [r.code, r])),\n`;
out += `  ...Object.fromEntries(districts.map((r) => [r.code, r])),\n`;
out += `  ...Object.fromEntries(localLevels.map((r) => [r.code, r])),\n`;
out += `};\n\n`;

out += `export const protectedAreasByCode: Record<string, ProtectedAreaModel> = Object.fromEntries(\n`;
out += `  protectedAreas.map((r) => [r.code, r]),\n`;
out += `);\n`;

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, out);
console.log(
  `Generated ${outPath} (${provinces.length} provinces, ${districts.length} districts, ${localLevels.length} local levels, ${protectedAreas.length} protected areas)`,
);
