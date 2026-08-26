const ids = [1, 4, 7];

function parseGlbJson(buffer) {
  const view = new DataView(buffer);
  const magic = view.getUint32(0, true);
  if (magic !== 0x46546c67) throw new Error('Not a GLB file');

  let offset = 12;
  while (offset + 8 <= buffer.byteLength) {
    const chunkLength = view.getUint32(offset, true);
    const chunkType = view.getUint32(offset + 4, true);
    offset += 8;
    if (chunkType === 0x4e4f534a) {
      const bytes = new Uint8Array(buffer, offset, chunkLength);
      const jsonText = new TextDecoder().decode(bytes).replace(/\u0000+$/g, '').trim();
      return JSON.parse(jsonText);
    }
    offset += chunkLength;
  }

  throw new Error('GLB has no JSON chunk');
}

for (const id of ids) {
  const url = `https://raw.githubusercontent.com/Pokemon-3D-api/assets/main/models/opt/regular/${id}.glb`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`#${id} fetch failed: ${response.status}`);
  const buffer = await response.arrayBuffer();
  const gltf = parseGlbJson(buffer);

  const joints = new Set((gltf.skins ?? []).flatMap((skin) => skin.joints ?? []));
  const jointNames = [...joints]
    .map((index) => gltf.nodes?.[index]?.name ?? `node_${index}`)
    .slice(0, 80);
  const animations = (gltf.animations ?? []).map((animation, index) => ({
    name: animation.name ?? `animation_${index}`,
    channels: animation.channels?.length ?? 0,
  }));

  console.log(`ASSET_PROBE #${String(id).padStart(3, '0')} bytes=${buffer.byteLength}`);
  console.log(JSON.stringify({ skins: gltf.skins?.length ?? 0, joints: joints.size, jointNames, animations }, null, 2));
}
