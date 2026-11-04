import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { AssetMapDataSource, MapDataSource, NepalMapData, preloadNepalMap } from '../dist/index.js';

const json = await readFile(new URL('../assets/maps/nepal.topo.json', import.meta.url), 'utf8');
const originalFetch = globalThis.fetch;

afterEach(() => {
  NepalMapData.clearCache();
  globalThis.fetch = originalFetch;
});

test('asset URLs have separate cache entries and identical URLs share a load', async () => {
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(url);
    return new Response(json);
  };
  const first = await NepalMapData.load(new AssetMapDataSource('/first.json'));
  const same = await NepalMapData.load(new AssetMapDataSource('/first.json'));
  const second = await NepalMapData.load(new AssetMapDataSource('/second.json'));
  assert.strictEqual(first, same);
  assert.notStrictEqual(first, second);
  assert.deepEqual(calls, ['/first.json', '/second.json']);
});

test('preload respects source keys and retries a failed load', async () => {
  let calls = 0;
  const source = MapDataSource.callback('retry', async () => {
    calls++;
    if (calls === 1) throw new Error('temporary failure');
    return json;
  });
  await assert.rejects(preloadNepalMap(source), /temporary failure/);
  const first = await preloadNepalMap(source);
  assert.strictEqual(await preloadNepalMap(source), first);
  const second = await preloadNepalMap(MapDataSource.string(json, 'other'));
  assert.notStrictEqual(first, second);
  assert.equal(calls, 2);
});
