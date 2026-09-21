import { mkdirSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

mkdirSync('public', { recursive: true });
const result = spawnSync(
  './node_modules/.bin/biome',
  ['lint', 'src/features/collection/OwnedPokemonCollectionPageReal.tsx'],
  { encoding: 'utf8' },
);
writeFileSync(
  'public/box-lint-diagnostics.txt',
  [result.stdout ?? '', result.stderr ?? '', `exit=${result.status ?? 'unknown'}\n`].join('\n'),
);
