import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BeyondMusicPlayer, isFmLibraryRecoveryRoute } from './BeyondMusicPlayer';

afterEach(() => vi.unstubAllGlobals());

describe('music player layout switching', () => {
  it('renders both compact and expanded frames in the same mounted player', () => {
    const html = renderToStaticMarkup(createElement(BeyondMusicPlayer));
    expect(html).toContain('data-expanded="false"');
    expect(html).toContain('class="beyond-music-launcher"');
    expect(html).toContain('id="beyond-music-panel"');
    expect(html).toContain('aria-hidden="true"');
    expect(html).not.toContain('MINHA BIBLIOTECA');
    expect(html).not.toContain('aria-label="Configurar biblioteca pessoal"');
    expect(html).not.toContain('id="beyond-fm-library-management"');
    expect(html).not.toContain('IMPORTAR 4 MÚSICAS');
    expect(html).not.toContain('SIMULAR FAIXA');
    expect(html.match(/beyond-music-electric-frame/g)?.length).toBeGreaterThanOrEqual(2);
  });
});

// Library recovery remains deliberate without adding controls to the normal UI.
describe('Beyond FM recovery URL', () => {
  it('requires an explicit recovery query parameter', () => {
    expect(isFmLibraryRecoveryRoute('')).toBe(false);
    expect(isFmLibraryRecoveryRoute('?fm-library=manage')).toBe(false);
    expect(isFmLibraryRecoveryRoute('?fm-library=recovery')).toBe(true);
    expect(isFmLibraryRecoveryRoute('?other=1&fm-library=recovery')).toBe(true);
  });
});

describe('Recovery route initial render', () => {
  it('expands the player and immediately displays the library controls on the recovery URL', () => {
    vi.stubGlobal('window', {
      location: { search: '?fm-library=recovery' },
      localStorage: { getItem: () => null },
    });
    const html = renderToStaticMarkup(createElement(BeyondMusicPlayer));
    expect(html).toContain('data-expanded="true"');
    expect(html).toContain('data-recovery="true"');
    expect(html).toContain('id="beyond-fm-library-management"');
    expect(html).toContain('ESCOLHER ZIP · 4 MÚSICAS');
    expect(html).toContain('RECUPERAR MÚSICAS');
    expect(html).not.toContain('Configurar biblioteca pessoal');
  });
});

describe('hosted Beyond FM manifest', () => {
  it('requires the exact four hosted tracks and their content hashes', async () => {
    const { hasHostedFmLibrary, BEYOND_FM_TRACKS, HOSTED_FM_TRACK_URLS } = await import('./beyondFmLibrary');
    const body = {
      version: 1,
      tracks: BEYOND_FM_TRACKS.map((track) => ({
        id: track.id,
        src: HOSTED_FM_TRACK_URLS[track.id as keyof typeof HOSTED_FM_TRACK_URLS],
        size: 12000,
        sha256: '0'.repeat(64),
      })),
    };
    const fetcher = vi.fn(async () => new Response(JSON.stringify(body), {
      status: 200, headers: { 'content-type': 'application/json' },
    }));
    expect(await hasHostedFmLibrary(fetcher)).toBe(true);
    expect(fetcher).toHaveBeenCalledWith('/beyond-fm/manifest.json', { cache: 'no-store' });

    body.tracks.pop();
    expect(await hasHostedFmLibrary(async () => new Response(JSON.stringify(body), {
      headers: { 'content-type': 'application/json' },
    }))).toBe(false);
  });

  it('rejects a Vite SPA fallback HTML page and offline fetches', async () => {
    const { hasHostedFmLibrary } = await import('./beyondFmLibrary');
    expect(await hasHostedFmLibrary(async () =>
      new Response('<!doctype html>', { headers: { 'content-type': 'text/html' } }),
    )).toBe(false);
    expect(await hasHostedFmLibrary(async () => { throw new Error('offline'); })).toBe(false);
  });
});
