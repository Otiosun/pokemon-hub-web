import { load } from 'unityfs-js';

const starters = [
  { dex: '001', name: 'Bulbasaur', fileId: '1ob8kkVaOeaVhx3Yer8araVjyRsWIaoPq' },
  { dex: '004', name: 'Charmander', fileId: '1oQlfpTSHcurqC-uUjXOpd50fyfa-t7nf' },
  { dex: '007', name: 'Squirtle', fileId: '1o3dihw_MQscSPhw4L2XKOZ00pr_GWVyY' },
];

const interestingClasses = [
  'AnimationClip',
  'AnimatorController',
  'Animator',
  'Avatar',
  'SkinnedMeshRenderer',
  'Mesh',
  'Texture2D',
  'GameObject',
  'AssetBundle',
];

async function downloadBundle(fileId) {
  const candidates = [
    `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=t`,
    `https://drive.google.com/uc?export=download&id=${fileId}`,
  ];

  let lastError;
  for (const url of candidates) {
    try {
      const response = await fetch(url, { redirect: 'follow' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const bytes = new Uint8Array(await response.arrayBuffer());
      const signature = new TextDecoder().decode(bytes.subarray(0, 7));
      if (signature !== 'UnityFS') {
        throw new Error(`unexpected payload ${signature || '<empty>'}`);
      }
      return bytes;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError ?? new Error('bundle download failed');
}

function safeName(info) {
  try {
    return info.name || '<unnamed>';
  } catch (error) {
    return `<name parse failed: ${error instanceof Error ? error.message : String(error)}>`;
  }
}

function summarizeAnimation(info) {
  try {
    const object = info.object;
    const summary = {};
    for (const key of ['name', 'legacy', 'sampleRate', 'wrapMode', 'useHighQualityCurve']) {
      const value = object?.[key];
      if (['string', 'number', 'boolean'].includes(typeof value)) summary[key] = value;
    }
    for (const [key, value] of Object.entries(object ?? {})) {
      if (Array.isArray(value) && value.length > 0 && value.length < 10000) {
        summary[`${key}Count`] = value.length;
      }
    }
    return summary;
  } catch (error) {
    return { parseError: error instanceof Error ? error.message : String(error) };
  }
}

for (const starter of starters) {
  console.log(`\nHOME_PROBE #${starter.dex} ${starter.name}`);
  const bytes = await downloadBundle(starter.fileId);
  console.log(`downloaded=${bytes.byteLength} signature=UnityFS`);

  const manager = await load(bytes, { unityRevision: '2020.3.11f1' });
  try {
    console.log('metadata=', JSON.stringify(manager.getMetadata()));
    console.log('stats=', JSON.stringify(manager.getStats()));

    for (const className of interestingClasses) {
      const infos = manager.getObjectInfosByClass(className);
      if (infos.length === 0) continue;
      console.log(`${className}=${infos.length}`);
      for (const info of infos.slice(0, 40)) {
        const base = {
          pathID: info.pathID.toString(),
          name: safeName(info),
          size: info.size,
        };
        if (className === 'AnimationClip') {
          base.animation = summarizeAnimation(info);
        }
        console.log(`  ${JSON.stringify(base)}`);
      }
    }
  } finally {
    manager.dispose();
  }
}
