import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { BeyondMusicPlayer } from './BeyondMusicPlayer';

describe('music player layout switching', () => {
  it('renders both compact and expanded frames in the same mounted player', () => {
    const html = renderToStaticMarkup(createElement(BeyondMusicPlayer));
    expect(html).toContain('data-expanded="false"');
    expect(html).toContain('class="beyond-music-launcher"');
    expect(html).toContain('id="beyond-music-panel"');
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('SIMULAR FAIXA');
    expect(html.match(/beyond-music-electric-frame/g)?.length).toBeGreaterThanOrEqual(2);
  });
});
