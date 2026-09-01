import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { MessagingOperationsView } from '../../lib/api/admin-api';
import { MessagingOperationsCard } from './MessagingOperationsCard';

const SNAPSHOT: MessagingOperationsView = {
  inbox: {
    counts: { RECEIVED: 1, PROCESSING: 0, PROCESSED: 10, FAILED: 1 },
    recent: [],
  },
  outbox: {
    counts: { PENDING: 2, SENDING: 0, SENT: 20, FAILED: 1, DEAD: 1 },
    recent: [],
    deadLetter: [],
  },
};

describe('Messaging operations card', () => {
  it('starts unqueried and exposes only a manual metadata refresh', () => {
    const html = renderToStaticMarkup(
      <MessagingOperationsCard client={{ getMessagingOperations: async () => SNAPSHOT }} />,
    );

    expect(html).toContain('Inbox / Outbox');
    expect(html).toContain('Ainda não consultado');
    expect(html).toContain('Atualizar filas');
    expect(html).toContain('Dead-letter');
    expect(html).not.toContain('payload');
    expect(html).not.toContain('destinationRef');
    expect(html).not.toContain('externalMessageId');
    expect(html).not.toContain('lastErrorCode');
  });
});
