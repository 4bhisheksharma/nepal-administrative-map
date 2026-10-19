/** Where the map loads its TopoJSON from. */
export abstract class MapDataSource {
  abstract readonly cacheKey: unknown;
  abstract load(): Promise<string>;

  static string(json: string, cacheKey: unknown = json): MapDataSource {
    return new StringMapDataSource(json, cacheKey);
  }

  static callback(
    cacheKey: unknown,
    load: () => Promise<string>,
  ): MapDataSource {
    return new CallbackMapDataSource(cacheKey, load);
  }
}

class StringMapDataSource extends MapDataSource {
  constructor(
    private readonly json: string,
    readonly cacheKey: unknown,
  ) {
    super();
  }

  load(): Promise<string> {
    return Promise.resolve(this.json);
  }
}

class CallbackMapDataSource extends MapDataSource {
  constructor(
    readonly cacheKey: unknown,
    private readonly loader: () => Promise<string>,
  ) {
    super();
  }

  load(): Promise<string> {
    return this.loader();
  }
}

/**
 * Loads the bundled TopoJSON. In bundlers, resolve via the package export
 * `nepal-administrative-map/assets/maps/nepal.topo.json`.
 */
export class AssetMapDataSource extends MapDataSource {
  readonly cacheKey = 'nepal-administrative-map:assets/maps/nepal.topo.json';

  constructor(private readonly url?: string) {
    super();
  }

  async load(): Promise<string> {
    if (!this.url) {
      throw new Error(
        'AssetMapDataSource requires a URL. Pass mapDataUrl to <NepalMap />, ' +
          'or construct AssetMapDataSource with the path from ' +
          '`nepal-administrative-map/assets/maps/nepal.topo.json`.',
      );
    }
    const res = await fetch(this.url);
    if (!res.ok) {
      throw new Error(`Failed to load map data: ${res.status} ${res.statusText}`);
    }
    return res.text();
  }
}
