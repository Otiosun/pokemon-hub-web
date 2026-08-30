import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const playerPagePath = fileURLToPath(
  new URL('../features/player360/Player360Page.tsx', import.meta.url),
);

describe('Control Center progressive disclosure contract', () => {
  it('keeps advanced player search options collapsed until explicitly requested', async () => {
    const playerPage = await readFile(playerPagePath, 'utf8');

    expect(playerPage).toContain('const [advancedOpen, setAdvancedOpen] = useState(false)');
    expect(playerPage).toContain('aria-expanded={advancedOpen}');
    expect(playerPage).toContain('Filtros avançados');
    expect(playerPage).toContain('onClick={() => setAdvancedOpen((open) => !open)}');
    expect(playerPage).toContain('{advancedOpen ? (');
    expect(playerPage).toContain('className="advanced-search-grid"');
    expect(playerPage).toContain('Exige leitura sensível');
  });
});
