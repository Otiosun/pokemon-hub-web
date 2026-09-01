import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const cardPath = fileURLToPath(new URL('./MessagingOperationsCard.tsx', import.meta.url));
const appPath = fileURLToPath(new URL('../../App.tsx', import.meta.url));

describe('messaging operations wiring', () => {
  it('keeps queue inspection explicit, metadata-only and mutation-free', async () => {
    const card = await readFile(cardPath, 'utf8');

    expect(card).toContain('getMessagingOperations');
    expect(card).toContain('Atualizar filas');
    expect(card).toContain('Dead-letter');
    expect(card).not.toContain('useEffect');
    expect(card).not.toContain('setInterval');
    expect(card).not.toMatch(/retry|reenviar|reprocessar|reiniciar/i);
    expect(card).not.toMatch(/payload|destinationRef|externalMessageId|lastErrorCode/i);
  });

  it('wires the messaging operations card to the authenticated Admin API client', async () => {
    const app = await readFile(appPath, 'utf8');

    expect(app).toContain('import { MessagingOperationsCard }');
    expect(app).toContain('<MessagingOperationsCard');
    expect(app).toContain('client={client}');
  });
});
