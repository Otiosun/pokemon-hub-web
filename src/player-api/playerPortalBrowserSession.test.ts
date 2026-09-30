import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  bootstrapPlayerPortalBrowserSession,
  extractPlayerPortalTicketFromUrl,
} from './playerPortalBrowserSession';

const ticket = 'A'.repeat(43);

describe('browser session bootstrap', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('deduplicates only an in-flight bootstrap and releases the cache after it settles', async () => {
    const replaceState = vi.fn();
    vi.stubGlobal('window', {
      location: { href: 'https://hub.example.test/jornada#hub_ticket=short' },
      history: { state: null, replaceState },
    });

    const first = bootstrapPlayerPortalBrowserSession();
    const concurrent = bootstrapPlayerPortalBrowserSession();

    expect(concurrent).toBe(first);
    await expect(first).resolves.toEqual({ status: 'invalid_ticket' });

    const later = bootstrapPlayerPortalBrowserSession();
    expect(later).not.toBe(first);
    await expect(later).resolves.toEqual({ status: 'invalid_ticket' });
  });
});

describe('extractPlayerPortalTicketFromUrl', () => {
  it('reads the canonical one-shot ticket from the URL fragment and returns a clean browser path', () => {
    const result = extractPlayerPortalTicketFromUrl(
      new URL(`https://hub.example.test/jornada?from=whatsapp#hub_ticket=${ticket}`),
    );

    expect(result).toEqual({
      ticket,
      cleanPath: '/jornada?from=whatsapp',
    });
  });

  it('removes malformed fragment tickets too so credentials do not linger in browser history', () => {
    const result = extractPlayerPortalTicketFromUrl(
      new URL('https://hub.example.test/jornada#hub_ticket=short'),
    );

    expect(result).toEqual({ ticket: 'short', cleanPath: '/jornada' });
  });

  it('does not accept query-string tickets because they are more likely to leak through URLs and logs', () => {
    const result = extractPlayerPortalTicketFromUrl(
      new URL(`https://hub.example.test/jornada?hub_ticket=${ticket}`),
    );

    expect(result).toEqual({ ticket: null, cleanPath: null });
  });
});
