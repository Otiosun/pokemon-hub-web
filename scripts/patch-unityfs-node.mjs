import { readFile, writeFile } from 'node:fs/promises';

const file = new URL('../node_modules/unityfs-js/assetManager.js', import.meta.url);
const source = await readFile(file, 'utf8');
const target = "import { processLive2DModel, exportSprite } from './exporters/index.js'";
const replacement = [
  "const processLive2DModel = async () => { throw new Error('Live2D exporter disabled in Node research probe') }",
  "const exportSprite = async () => { throw new Error('Sprite exporter disabled in Node research probe') }",
].join('\n');

if (!source.includes(target)) {
  console.log('UNITYFS_NODE_PATCH already applied or upstream changed');
} else {
  await writeFile(file, source.replace(target, replacement), 'utf8');
  console.log('UNITYFS_NODE_PATCH applied');
}
