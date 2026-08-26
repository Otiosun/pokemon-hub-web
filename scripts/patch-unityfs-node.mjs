import { readFile, writeFile } from 'node:fs/promises';

async function patchFile(relativePath, replacements) {
  const file = new URL(`../node_modules/unityfs-js/${relativePath}`, import.meta.url);
  let source = await readFile(file, 'utf8');
  let changed = false;

  for (const [target, replacement] of replacements) {
    if (source.includes(target)) {
      source = source.replace(target, replacement);
      changed = true;
    }
  }

  if (changed) {
    await writeFile(file, source, 'utf8');
    console.log(`UNITYFS_NODE_PATCH applied ${relativePath}`);
  } else {
    console.log(`UNITYFS_NODE_PATCH unchanged ${relativePath}`);
  }
}

await patchFile('assetManager.js', [
  [
    "import { processLive2DModel, exportSprite } from './exporters/index.js'",
    [
      "const processLive2DModel = async () => { throw new Error('Live2D exporter disabled in Node research probe') }",
      "const exportSprite = async () => { throw new Error('Sprite exporter disabled in Node research probe') }",
    ].join('\n'),
  ],
]);

await patchFile('decoders/DecoderManager.js', [
  [
    "import { decodeTexture2D } from './drivers/Texture2DDecoder.js'",
    "const decodeTexture2D = async () => { throw new Error('Texture decoding disabled in Node research probe') }",
  ],
  [
    "import { decodeAudioFSB5 } from './drivers/AudioFSB5Decoder.js'",
    "const decodeAudioFSB5 = async () => { throw new Error('Audio decoding disabled in Node research probe') }",
  ],
]);
