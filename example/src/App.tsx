import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import {
  AdminLevel,
  Choropleth,
  ColorScale,
  District,
  LocalizedName,
  MapMarkers,
  NepalMap,
  NepalMapBreadcrumb,
  NepalMapData,
  NepalMapSearchField,
  Province,
  useNepalMapController,
  useNepalMapControllerState,
  type AdminLevelId,
  type Region,
} from 'nepal-administrative-map';
import topoUrl from '../../assets/maps/nepal.topo.json?url';
import { cities } from './cities';

type ColourBy = 'nothing' | 'area' | 'localLevels';

export function App() {
  const controller = useNepalMapController();
  const { level: drillLevel, language: ctrlLang } =
    useNepalMapControllerState(controller);

  const [dark, setDark] = useState(false);
  const [drillDown, setDrillDown] = useState(true);
  const [level, setLevel] = useState<AdminLevelId>('district');
  const [scope, setScope] = useState<Region | null>(null);
  const [bilingual, setBilingual] = useState(false);
  const [protectedAreas, setProtectedAreas] = useState(false);
  const [cityMarkers, setCityMarkers] = useState(false);
  const [authorCredit, setAuthorCredit] = useState(true);
  const [colourBy, setColourBy] = useState<ColourBy>('nothing');
  const [tapped, setTapped] = useState<Region | null>(null);
  const [mapData, setMapData] = useState<NepalMapData | null>(null);

  const language = ctrlLang ?? 'en';
  const ne = language === 'ne';
  const activeLevel = drillDown ? drillLevel : level;

  useEffect(() => {
    document.body.classList.toggle('dark', dark);
  }, [dark]);

  useEffect(() => {
    fetch(topoUrl)
      .then((r) => r.text())
      .then((json) => setMapData(NepalMapData.parse(json)))
      .catch(console.error);
  }, []);

  const choropleth = useMemo(() => {
    if (colourBy === 'nothing' || !mapData) return null;

    if (colourBy === 'area') {
      const values = new Map<Region, number>();
      for (const shape of mapData.shapesOf(activeLevel)) {
        values.set(shape.feature, Math.round(shape.areaKm2));
      }
      return new Choropleth({
        values,
        scale: ColorScale.sequential('#fff8e1', '#e65100'),
        title: new LocalizedName('Area (km²)', 'क्षेत्रफल (किमी²)'),
      });
    }

    if (activeLevel === 'localLevel') return null;

    const values = new Map<Region, number>();
    for (const shape of mapData.shapesOf(activeLevel)) {
      const r = shape.feature;
      if (r.level.id === 'province') {
        values.set(r, (r as (typeof Province)['koshi']).localLevels.length);
      } else if (r.level.id === 'district') {
        values.set(r, (r as (typeof District)['kaski']).localLevels.length);
      }
    }
    return new Choropleth({
      values,
      scale: ColorScale.sequential('#e3f2fd', '#0d47a1'),
      title: new LocalizedName('Local levels', 'स्थानीय तह'),
    });
  }, [colourBy, mapData, activeLevel]);

  const markers = cityMarkers
    ? cities.map((c) =>
        MapMarkers.widget(c.point, <Pin />, { data: ne ? c.ne : c.en }),
      )
    : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <header style={headerStyle(dark)}>
        <h1 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
          {ne ? 'नेपालको प्रशासनिक नक्सा' : 'Nepal Administrative Map'}
        </h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Segmented
            value={language}
            options={[
              { value: 'en', label: 'EN' },
              { value: 'ne', label: 'नेपाली' },
            ]}
            onChange={(v) => {
              controller.language = v;
            }}
          />
          <button type="button" onClick={() => setDark((d) => !d)} style={btnStyle}>
            {dark ? 'Light' : 'Dark'}
          </button>
        </div>
      </header>

      <div
        style={{
          padding: '12px 12px 0',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          alignItems: 'center',
        }}
      >
        <Toggle
          label={ne ? 'तह अनुसार खोल्नुहोस्' : 'Drill down'}
          value={drillDown}
          onChange={setDrillDown}
        />
        <Toggle
          label={ne ? 'दुवै भाषामा नाम' : 'Bilingual labels'}
          value={bilingual}
          onChange={setBilingual}
        />
        <Toggle
          label={ne ? 'संरक्षित क्षेत्र' : 'Protected areas'}
          value={protectedAreas}
          onChange={setProtectedAreas}
        />
        <Toggle
          label={ne ? 'शहरहरू' : 'Cities'}
          value={cityMarkers}
          onChange={setCityMarkers}
        />
        <Toggle
          label={ne ? 'क्रेडिट' : 'Credit'}
          value={authorCredit}
          onChange={setAuthorCredit}
        />
        <select
          value={colourBy}
          onChange={(e) => setColourBy(e.target.value as ColourBy)}
          style={selectStyle}
        >
          <option value="nothing">{ne ? 'रङ: छैन' : 'Colour: none'}</option>
          <option value="area">{ne ? 'रङ: क्षेत्रफल' : 'Colour: area'}</option>
          <option value="localLevels">
            {ne ? 'रङ: स्थानीय तह' : 'Colour: local levels'}
          </option>
        </select>
        <div style={{ width: 260 }}>
          <NepalMapSearchField controller={controller} language={language} />
        </div>
        {!drillDown ? (
          <>
            <Segmented
              value={level}
              options={[
                {
                  value: 'province',
                  label: AdminLevel.province.label.of(language),
                },
                {
                  value: 'district',
                  label: AdminLevel.district.label.of(language),
                },
                {
                  value: 'localLevel',
                  label: AdminLevel.localLevel.label.of(language),
                },
              ]}
              onChange={(v) => {
                setLevel(v);
                setTapped(null);
              }}
            />
            <select
              value={scope?.code ?? ''}
              onChange={(e) => {
                const code = e.target.value;
                const p = code
                  ? (Object.values(Province).find((x) => x.code === code) ??
                    null)
                  : null;
                setScope(p);
                if (p && level === 'province') setLevel('district');
                setTapped(null);
              }}
              style={selectStyle}
            >
              <option value="">{ne ? 'सम्पूर्ण नेपाल' : 'All of Nepal'}</option>
              {Object.values(Province).map((p) => (
                <option key={p.code} value={p.code}>
                  {p.fullName(language)}
                </option>
              ))}
            </select>
          </>
        ) : null}
      </div>

      {drillDown ? (
        <div style={{ padding: '8px 16px 0' }}>
          <NepalMapBreadcrumb controller={controller} language={language} />
        </div>
      ) : null}

      <div style={{ flex: 1, position: 'relative', minHeight: 0, margin: 12 }}>
        <NepalMap
          key={drillDown ? 'drill' : `static-${level}-${scope?.code ?? 'all'}`}
          controller={controller}
          mapDataUrl={topoUrl}
          drillDown={drillDown}
          level={drillDown ? undefined : level}
          scope={drillDown ? null : scope}
          labelMode={bilingual ? 'both' : undefined}
          language={language}
          theme={dark ? 'dark' : 'light'}
          onRegionTap={(r) => setTapped(r)}
          choropleth={choropleth}
          showProtectedAreas={protectedAreas}
          showPackageCredit={authorCredit}
          markers={markers}
          onMarkerTap={(m) => alert(String(m.data))}
          placeholder={
            <div style={{ display: 'grid', placeItems: 'center', height: '100%' }}>
              Loading…
            </div>
          }
        />
        <div
          style={{
            position: 'absolute',
            right: 12,
            top: 12,
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          <button type="button" style={zoomBtn} onClick={() => controller.zoomIn()}>
            +
          </button>
          <button type="button" style={zoomBtn} onClick={() => controller.zoomOut()}>
            −
          </button>
          <button
            type="button"
            style={zoomBtn}
            onClick={() => controller.resetView()}
          >
            ⟲
          </button>
        </div>
      </div>

      <footer style={{ padding: 16, fontSize: 14, opacity: 0.85 }}>
        {tapped
          ? tapped.fullName(language)
          : ne
            ? 'नक्सामा ट्याप गर्नुहोस्'
            : 'Tap a region on the map'}
      </footer>
    </div>
  );
}

function Pin() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="#c62828">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z" />
    </svg>
  );
}

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label
      style={{
        display: 'inline-flex',
        gap: 6,
        alignItems: 'center',
        fontSize: 13,
      }}
    >
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div
      style={{
        display: 'inline-flex',
        border: '1px solid #90a4ae',
        borderRadius: 8,
        overflow: 'hidden',
      }}
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          style={{
            ...btnStyle,
            borderRadius: 0,
            border: 'none',
            background: value === o.value ? '#3949ab' : 'transparent',
            color: value === o.value ? '#fff' : 'inherit',
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

const headerStyle = (dark: boolean): CSSProperties => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '12px 16px',
  borderBottom: dark ? '1px solid #30363d' : '1px solid #cfd8dc',
  background: dark ? '#161b22' : '#fff',
});

const btnStyle: CSSProperties = {
  padding: '6px 10px',
  borderRadius: 8,
  border: '1px solid #90a4ae',
  background: 'transparent',
  cursor: 'pointer',
  color: 'inherit',
};

const selectStyle: CSSProperties = {
  padding: '6px 10px',
  borderRadius: 8,
  border: '1px solid #90a4ae',
  background: 'transparent',
  color: 'inherit',
};

const zoomBtn: CSSProperties = {
  ...btnStyle,
  width: 36,
  height: 36,
  background: 'rgba(255,255,255,0.9)',
  color: '#1a237e',
  fontSize: 18,
};
