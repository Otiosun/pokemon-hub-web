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
