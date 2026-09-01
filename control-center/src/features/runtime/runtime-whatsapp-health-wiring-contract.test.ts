import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const cardPath = fileURLToPath(new URL('./RuntimeWhatsappHealthCard.tsx', import.meta.url));
const appPath = fileURLToPath(new URL('../../App.tsx', import.meta.url));

describe('runtime WhatsApp health wiring', () => {
  it('keeps the runtime read explicit and mutation-free', async () => {
    const card = await readFile(cardPath, 'utf8');

    expect(card).toContain('getRuntimeWhatsappHealth');
    expect(card).toContain('Atualizar estado');
    expect(card).not.toContain('useEffect');
    expect(card).not.toContain('setInterval');
    expect(card).not.toMatch(/reiniciar|restart/i);
    expect(card).not.toContain('whatsappSessionKey');
    expect(card).not.toContain('shutdownReason');
  });

  it('binds the runtime card to the authenticated session environment', async () => {
    const app = await readFile(appPath, 'utf8');

    expect(app).toContain("import { RuntimeWhatsappHealthCard }");
    expect(app).toContain('<RuntimeWhatsappHealthCard');
    expect(app).toContain('client={client}');
    expect(app).toContain('expectedEnvironment={session.environment}');
  });
});
