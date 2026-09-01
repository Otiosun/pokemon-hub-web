import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { RuntimeWhatsappHealthView } from '../../lib/api/admin-api';
import { RuntimeWhatsappHealthCard } from './RuntimeWhatsappHealthCard';

const CONNECTED: RuntimeWhatsappHealthView = {
  environment: 'staging',
  runtime: {
    providerState: 'CONNECTED',
    deploymentRevision: 'c'.repeat(40),
    startedAt: '2026-09-01T09:55:00.000Z',
    lastConnectedAt: '2026-09-01T09:56:00.000Z',
    lastHeartbeatAt: '2026-09-01T10:05:00.000Z',
    lastDisconnectAt: null,
    stoppedAt: null,
  },
};

describe('Runtime WhatsApp operational card', () => {
  it('starts unqueried and exposes only an explicit read refresh', () => {
    const html = renderToStaticMarkup(
      <RuntimeWhatsappHealthCard
        client={{ getRuntimeWhatsappHealth: async () => CONNECTED }}
        expectedEnvironment="staging"
      />,
    );

    expect(html).toContain('Runtime WhatsApp');
    expect(html).toContain('Ainda não consultado');
    expect(html).toContain('Atualizar estado');
    expect(html).not.toMatch(/reiniciar|restart/i);
    expect(html).not.toContain('whatsappSessionKey');
    expect(html).not.toContain('shutdownReason');
  });
});
