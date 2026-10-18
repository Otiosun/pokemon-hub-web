import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { BeyondMusicPlayer } from './BeyondMusicPlayer';

describe('Beyond FM Play interaction safety', () => {
  it('does not silently disable Play when no local song library is installed', () => {
    const html = renderToStaticMarkup(createElement(BeyondMusicPlayer));
    const play = html.match(/<button[^>]*class="beyond-music-play"[^>]*>/)?.[0] ?? '';
    expect(play).toContain('aria-label="Adicionar quatro faixas para tocar"');
    expect(play).not.toContain('disabled');
    expect(html).toContain('ADICIONAR 4 FAIXAS');
    expect(html).toContain('Verificando músicas salvas');
  });
});
