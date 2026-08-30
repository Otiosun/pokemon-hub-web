import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const playerPagePath = fileURLToPath(
  new URL('../features/player360/Player360Page.tsx', import.meta.url),
);
const sessionGatePath = fileURLToPath(
  new URL('../components/shell/SessionGate.tsx', import.meta.url),
);

describe('Control Center operational state surfaces', () => {
  it('presents loading, empty, error and success/ready states explicitly', async () => {
    const [playerPage, sessionGate] = await Promise.all([
      readFile(playerPagePath, 'utf8'),
      readFile(sessionGatePath, 'utf8'),
    ]);

    expect(playerPage).toContain("useState<'idle' | 'loading' | 'ready' | 'error'>('idle')");
    expect(playerPage).toContain("searchStatus === 'loading' ? 'Buscando…' : 'Buscar jogadores'");
    expect(playerPage).toContain('className="request-error" role="alert"');
    expect(playerPage).toContain("searchStatus === 'ready'");
    expect(playerPage).toContain('className="results-empty"');
    expect(playerPage).toContain("selectedStatus === 'loading'");
    expect(playerPage).toContain('role="status"');
    expect(playerPage).toContain('player360-empty-sidebar request-error');
    expect(playerPage).toContain('className="player360-selected"');
    expect(playerPage).toContain('NENHUM JOGADOR SELECIONADO');

    expect(sessionGate).toContain('aria-live="polite"');
    expect(sessionGate).toContain("state.status === 'loading'");
    expect(sessionGate).toContain('ACESSO BLOQUEADO');
  });
});
