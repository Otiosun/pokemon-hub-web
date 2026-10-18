import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { BeyondMusicPlayer } from './BeyondMusicPlayer';

describe('Beyond FM Play interaction safety', () => {
  it('does not silently disable Play when no local song library is installed', () => {
    const html = renderToStaticMarkup(createElement(BeyondMusicPlayer));
    const play = html.match(/<button[^>]*class="beyond-music-play"[^>]*>/)?.[0] ?? '';
    expect(play).toContain('aria-label="Tocar música"');
    expect(play).not.toContain('disabled');
    expect(html).not.toContain('IMPORTAR 4 MÚSICAS · ZIP/MP3');
    expect(html).not.toContain('MINHA BIBLIOTECA');
    expect(html).not.toContain('beyond-fm-settings-toggle');
    expect(html).toContain('aria-expanded="false"');
    expect(html).not.toContain('SUBSTITUIR SÓ ALOLA');
  });
});
