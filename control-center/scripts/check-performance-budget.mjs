import { readFileSync, readdirSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { extname, join } from 'node:path';

const assetsDir = new URL('../dist/assets/', import.meta.url);
const budgets = {
  jsTotalRaw: 340 * 1024,
  jsTotalGzip: 100 * 1024,
  jsChunkRaw: 260 * 1024,
  cssTotalRaw: 70 * 1024,
  cssTotalGzip: 16 * 1024,
};

const files = readdirSync(assetsDir, { withFileTypes: true })
  .filter((entry) => entry.isFile())
  .map((entry) => {
    const path = join(assetsDir.pathname, entry.name);
    const bytes = readFileSync(path);
    return {
      name: entry.name,
      extension: extname(entry.name),
      raw: bytes.byteLength,
      gzip: gzipSync(bytes).byteLength,
    };
  });

const js = files.filter((file) => file.extension === '.js');
const css = files.filter((file) => file.extension === '.css');
const sum = (items, key) => items.reduce((total, item) => total + item[key], 0);
const violations = [];

const jsTotalRaw = sum(js, 'raw');
const jsTotalGzip = sum(js, 'gzip');
const cssTotalRaw = sum(css, 'raw');
const cssTotalGzip = sum(css, 'gzip');

if (jsTotalRaw > budgets.jsTotalRaw) {
  violations.push(`JS total ${jsTotalRaw} > ${budgets.jsTotalRaw} bytes`);
}
if (jsTotalGzip > budgets.jsTotalGzip) {
  violations.push(`JS gzip total ${jsTotalGzip} > ${budgets.jsTotalGzip} bytes`);
}
if (cssTotalRaw > budgets.cssTotalRaw) {
  violations.push(`CSS total ${cssTotalRaw} > ${budgets.cssTotalRaw} bytes`);
}
if (cssTotalGzip > budgets.cssTotalGzip) {
  violations.push(`CSS gzip total ${cssTotalGzip} > ${budgets.cssTotalGzip} bytes`);
}
for (const chunk of js) {
  if (chunk.raw > budgets.jsChunkRaw) {
    violations.push(`JS chunk ${chunk.name} ${chunk.raw} > ${budgets.jsChunkRaw} bytes`);
  }
}

console.log(
  'CONTROL_CENTER_PERFORMANCE_BUDGET',
  JSON.stringify({
    budgets,
    actual: { jsTotalRaw, jsTotalGzip, cssTotalRaw, cssTotalGzip },
    jsChunks: js.map(({ name, raw, gzip }) => ({ name, raw, gzip })),
  }),
);

if (violations.length > 0) {
  throw new Error(`Control Center performance budget exceeded: ${violations.join('; ')}`);
}
