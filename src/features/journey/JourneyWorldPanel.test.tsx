import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import journeyPageSource from './JourneyPageV2.tsx?raw';
import { JourneyWorldPanel } from './JourneyWorldPanel';

describe('JourneyWorldPanel', () => {
  it('renders an explicit disconnected state instead of preview location when Hub auth is absent', () => {
    const html = renderToStaticMarkup(<JourneyWorldPanel enabled={false} />);

    expect(html).toContain('data-journey-world="disconnected"');
    expect(html).toContain('MAPA INDISPONÍVEL');
    expect(html).not.toContain('Route 1');
  });

  it('starts an authenticated world read without rendering preview location as if it were real', () => {
    const html = renderToStaticMarkup(<JourneyWorldPanel enabled />);

    expect(html).toContain('data-journey-world="loading"');
    expect(html).toContain('LENDO MAPA');
    expect(html).not.toContain('Route 1');
  });

  it('is composed inside Jornada rather than added as a fourth global Hub destination', () => {
    expect(journeyPageSource).toContain("import { JourneyWorldPanel } from './JourneyWorldPanel';");
    expect(journeyPageSource).toContain(
      "<JourneyWorldPanel enabled={playerPortalSession.status === 'authenticated'} />",
    );
  });
});
