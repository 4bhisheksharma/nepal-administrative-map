# nepal-administrative-map

[![npm](https://img.shields.io/npm/v/nepal-administrative-map.svg)](https://www.npmjs.com/package/nepal-administrative-map)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/4bhisheksharma/nepal_administrative_map/blob/main/LICENSE)
[![live demo](https://img.shields.io/badge/demo-live-brightgreen.svg)](https://4bhisheksharma.github.io/nepal_administrative_map/)

An interactive administrative map of Nepal for **React**: **7 provinces,
77 districts and 753 local levels**, in **English and Nepali (नेपाली)**.

**[▶ Try the live demo](https://4bhisheksharma.github.io/nepal_administrative_map/)** in your browser, no install needed.

Sister package to the Flutter
[`nepal_administrative_map`](https://pub.dev/packages/nepal_administrative_map)
pub package — same data, codes, and feature set.

- **One component to start:** `<NepalMap />` — no API keys, offline, ~422 KB bundled TopoJSON
- **Bilingual:** names, labels, tooltips, legends and numbers in English or Nepali
- **Interactive:** zoom, pan, tap to select, hover tooltips, and animated drill-down province → district → local level
- **Data maps:** choropleth colouring with legend, markers, and place search
- **Typed regions:** `District.kaski`, `LocalLevel.pokhara`, stable codes for clean joins
- **Zero runtime dependencies** besides React (peer)

| Provinces in Nepali | Dark mode |
|---|---|
| ![Provinces coloured by area, in Nepali](https://raw.githubusercontent.com/4bhisheksharma/nepal_administrative_map/main/assets/screenshots/provinces_nepali.jpg) | ![Province map in dark mode](https://raw.githubusercontent.com/4bhisheksharma/nepal_administrative_map/main/assets/screenshots/provinces_dark.jpg) |
| **Overlays and bilingual labels** | **All 77 districts** |
| ![Protected areas, city markers and bilingual labels](https://raw.githubusercontent.com/4bhisheksharma/nepal_administrative_map/main/assets/screenshots/overlays_bilingual.jpg) | ![Districts with English and Nepali labels](https://raw.githubusercontent.com/4bhisheksharma/nepal_administrative_map/main/assets/screenshots/districts_bilingual.jpg) |
| **Local levels by type** | |
| ![Local levels coloured by type, with a tooltip](https://raw.githubusercontent.com/4bhisheksharma/nepal_administrative_map/main/assets/screenshots/local_level_types.jpg) | |

## Install

```sh
npm install nepal-administrative-map
```

## Quick start

```tsx
import { NepalMap, AdminLevel } from 'nepal-administrative-map';
import topoUrl from 'nepal-administrative-map/assets/maps/nepal.topo.json?url';

export function App() {
  return (
    <div style={{ height: 480 }}>
      <NepalMap
        mapDataUrl={topoUrl}
        level={AdminLevel.district.id}
        onRegionTap={(region) => console.log(region.fullName('en'))}
      />
    </div>
  );
}
```

> Pass `mapDataUrl` to the bundled TopoJSON (Vite `?url`, webpack asset modules, or copy the file into your `public/` folder). Framework-agnostic data APIs are also available from `nepal-administrative-map/core`.

## Common setups

```tsx
// Provinces (default), tap to select
<NepalMap mapDataUrl={topoUrl} />

// Drill down with animated zoom: province → districts → local levels
<NepalMap mapDataUrl={topoUrl} drillDown animationDuration={400} />

// Gandaki's districts, in Nepali
import { Province } from 'nepal-administrative-map';
<NepalMap
  mapDataUrl={topoUrl}
  level="district"
  scope={Province.gandaki}
  language="ne"
/>

// Choropleth
import { Choropleth, ColorScale, District, LocalizedName } from 'nepal-administrative-map';
<NepalMap
  mapDataUrl={topoUrl}
  level="district"
  choropleth={new Choropleth({
    values: new Map([
      [District.kathmandu, 1744240],
      [District.lalitpur, 548401],
    ]),
    scale: ColorScale.sequential('#fff8e1', '#e65100'),
    title: new LocalizedName('Population', 'जनसंख्या'),
  })}
/>

// Controller
import { useNepalMapController, NepalMapBreadcrumb, NepalMapSearchField } from 'nepal-administrative-map';

const controller = useNepalMapController();
<>
  <NepalMapBreadcrumb controller={controller} />
  <NepalMapSearchField controller={controller} />
  <NepalMap mapDataUrl={topoUrl} controller={controller} drillDown />
</>
```

## API overview

| Export | Role |
|---|---|
| `NepalMap` | Main React map component |
| `NepalMapController` / `useNepalMapController` | Select, zoom, drill, language, `toPngBlob` |
| `NepalMapBreadcrumb` | Nepal › Province › District |
| `NepalMapSearchField` | Autocomplete search |
| `NepalMapLegend` | Choropleth legend (also embedded when `showLegend`) |
| `Choropleth` / `ColorScale` | Data colouring (sequential, diverging, threshold, categorical) |
| `Province` / `District` / `LocalLevel` / `ProtectedArea` | Typed gazetteer |
| `Nepal.byCode` / `Nepal.search` / `NepalMapData` | Core data & geometry (also via `/core`) |

## Attribution

Map boundary data is **CC BY 4.0** (OKNP LocalBoundaries). See
[DATA_LICENSE.md](https://github.com/4bhisheksharma/nepal_administrative_map/blob/main/DATA_LICENSE.md).
The map shows attribution by default; keep it visible or credit equivalently in your UI.

## Example

```sh
cd example
npm install
npm run dev
```

## Development

```sh
npm install
npm run generate   # gazetteer from Flutter names.csv (optional if already generated)
npm run build      # dist/ for npm publish
npm run pack:check # preview tarball contents
```

## Publishing

```sh
npm login
npm run build
npm publish
```

Package: [`nepal-administrative-map`](https://www.npmjs.com/package/nepal-administrative-map). Requires Node 18+.

## License

- **Code:** [MIT](https://github.com/4bhisheksharma/nepal_administrative_map/blob/main/LICENSE)
- **Map data / names / codes:** [CC BY 4.0](https://github.com/4bhisheksharma/nepal_administrative_map/blob/main/DATA_LICENSE.md)
