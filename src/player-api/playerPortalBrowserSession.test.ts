import { describe, expect, it } from 'vitest';
import { extractPlayerPortalTicketFromUrl } from './playerPortalBrowserSession';

const ticket = 'A'.repeat(43);

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
