import { describe, expect, it } from 'vitest';

import { mimeTypeFor, parseByteRange, resolveStaticPath } from './serve-generations-assets.mjs';

describe('Generations asset service', () => {
  it('only resolves files below /research', () => {
    const root = '/srv/app/public';

    expect(resolveStaticPath('/research/generations/charizard/asset.json', root)).toBe(
      '/srv/app/public/research/generations/charizard/asset.json',
    );
    expect(resolveStaticPath('/research/draco/draco_decoder.js', root)).toBe(
      '/srv/app/public/research/draco/draco_decoder.js',
    );
    expect(resolveStaticPath('/index.html', root)).toBeNull();
    expect(resolveStaticPath('/research/%2e%2e/package.json', root)).toBeNull();
  });

  it('serves model and decoder MIME types explicitly', () => {
    expect(mimeTypeFor('/tmp/model.glb')).toBe('model/gltf-binary');
    expect(mimeTypeFor('/tmp/draco_decoder.wasm')).toBe('application/wasm');
    expect(mimeTypeFor('/tmp/asset.json')).toBe('application/json; charset=utf-8');
  });

  it('parses normal, open-ended and suffix byte ranges', () => {
    expect(parseByteRange('bytes=0-99', 1000)).toEqual({ start: 0, end: 99 });
    expect(parseByteRange('bytes=900-', 1000)).toEqual({ start: 900, end: 999 });
    expect(parseByteRange('bytes=-100', 1000)).toEqual({ start: 900, end: 999 });
    expect(parseByteRange('bytes=1000-', 1000)).toBeNull();
    expect(parseByteRange('items=0-10', 1000)).toBeNull();
  });
});
