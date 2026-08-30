import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';

const EXPECTED_LOCKFILE_SHA256 = 'dcacde6be17cf53c6c8acaa08f1715c0e25afc1f5fdc4c27300edd4862241e72';
const sourcePath = fileURLToPath(new URL('../pnpm-lock.yaml.gz.b64', import.meta.url));
const targetPath = fileURLToPath(new URL('../pnpm-lock.yaml', import.meta.url));

const encodedSource = (await readFile(sourcePath, 'utf8')).trim();
if (!/^[A-Za-z0-9+/]+={0,2}$/.test(encodedSource)) {
  throw new Error('Control Center lockfile source is not valid base64.');
}

const lockfile = gunzipSync(Buffer.from(encodedSource, 'base64'));
const actualSha256 = createHash('sha256').update(lockfile).digest('hex');
if (actualSha256 !== EXPECTED_LOCKFILE_SHA256) {
  throw new Error(
    `Control Center lockfile integrity mismatch: expected ${EXPECTED_LOCKFILE_SHA256}, received ${actualSha256}.`,
  );
}

await writeFile(targetPath, lockfile);
console.log(`Control Center lockfile materialized and verified: sha256 ${actualSha256}`);
