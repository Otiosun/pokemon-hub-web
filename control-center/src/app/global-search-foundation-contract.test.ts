import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const appPath = fileURLToPath(new URL('../App.tsx', import.meta.url));

describe('Control Center global search foundation', () => {
  it('provides a typed global search entry point without pretending the command palette is complete', async () => {
    const app = await readFile(appPath, 'utf8');

    expect(app).toContain("const [query, setQuery] = useState('')");
    expect(app).toContain('aria-label="Busca global"');
    expect(app).toContain('onChange={(event) => setQuery(event.target.value)}');
    expect(app).toContain('placeholder="Buscar jogador, operação ou área"');
    expect(app).toContain('query={query}');
    expect(app).toContain('BUSCA GLOBAL · FOUNDATION');
    expect(app).toContain('Para localizar um jogador agora, use a');
    expect(app).toContain('onOpenPlayers');
  });
});
