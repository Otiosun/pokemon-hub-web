import { spawnSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const importerRoot = join(tmpdir(), 'poke-importer');
const pythonTarget = join(tmpdir(), 'pokemon-hub-py');
const importerRepository =
  'https://github.com/ChicoEevee/Pokemon-Switch-Model-Importer-Blender.git';

function probe(command, args) {
  const result = spawnSync(command, args, {
    cwd: repositoryRoot,
    stdio: 'ignore',
    shell: false,
  });

  return !result.error && result.status === 0;
}

function resolvePython() {
  const candidates =
    process.platform === 'win32'
      ? [
          { command: 'py', prefix: ['-3'] },
          { command: 'python', prefix: [] },
          { command: 'python3', prefix: [] },
        ]
      : [
          { command: 'python3', prefix: [] },
          { command: 'python', prefix: [] },
        ];

  for (const candidate of candidates) {
    if (probe(candidate.command, [...candidate.prefix, '--version'])) {
      return candidate;
    }
  }

  throw new Error(
    'Python 3 was not found. Install Python 3 and ensure py, python, or python3 is available on PATH.',
  );
}

function run(command, args, options = {}) {
  const printable = [command, ...args].join(' ');
  console.log(`[generations-preview] ${printable}`);

  const result = spawnSync(command, args, {
    cwd: repositoryRoot,
    stdio: 'inherit',
    shell: false,
    ...options,
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

const python = resolvePython();

rmSync(importerRoot, { force: true, recursive: true });
rmSync(pythonTarget, { force: true, recursive: true });

run('git', ['clone', '--depth', '1', '--quiet', importerRepository, importerRoot]);
run(python.command, [
  ...python.prefix,
  '-m',
  'pip',
  'install',
  '--disable-pip-version-check',
  '--quiet',
  '--target',
  pythonTarget,
  'py7zr',
  'flatbuffers',
  'pillow',
  'numpy',
]);

const pythonPath = [
  join(repositoryRoot, 'scripts'),
  pythonTarget,
  importerRoot,
  process.env.PYTHONPATH,
]
  .filter(Boolean)
  .join(delimiter);

run(
  python.command,
  [...python.prefix, 'scripts/build-generations-player-preview.py'],
  {
    env: {
      ...process.env,
      PYTHONPATH: pythonPath,
    },
  },
);
