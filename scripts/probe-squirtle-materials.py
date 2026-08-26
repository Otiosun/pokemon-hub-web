from __future__ import annotations

import importlib.util
import io
import json
import tempfile
import zipfile
from pathlib import Path

import py7zr

AUDIT_PATH = Path(__file__).with_name('audit-generations-gen1-3.py')
AUDIT_SPEC = importlib.util.spec_from_file_location('generations_audit', AUDIT_PATH)
if AUDIT_SPEC is None or AUDIT_SPEC.loader is None:
    raise RuntimeError('Unable to load audit helpers')
AUDIT = importlib.util.module_from_spec(AUDIT_SPEC)
AUDIT_SPEC.loader.exec_module(AUDIT)

MODEL_ENTRY = 'assets/generations_core/bedrock/pokemon/models/squirtle.pk'


def glb_document(data: bytes) -> dict:
    if data[:4] != b'glTF':
        raise RuntimeError('model is not GLB')
    json_length = int.from_bytes(data[12:16], 'little')
    chunk_type = int.from_bytes(data[16:20], 'little')
    if chunk_type != 0x4E4F534A:
        raise RuntimeError('first GLB chunk is not JSON')
    return json.loads(data[20:20 + json_length].rstrip(b'\x00 \t\r\n').decode('utf-8'))


def main() -> None:
    metadata = AUDIT.latest_pack(1)
    pack_path = AUDIT.download_pack(1, metadata)
    with zipfile.ZipFile(pack_path) as archive:
        payload = archive.read(MODEL_ENTRY)

    with tempfile.TemporaryDirectory(prefix='squirtle-material-probe-') as tmp:
        destination = Path(tmp)
        with py7zr.SevenZipFile(io.BytesIO(payload), mode='r') as seven:
            names = [name for name in seven.getnames() if name and name.strip()]
            seven.extract(path=destination, targets=names)

        config = json.loads((destination / 'config.json').read_text('utf-8'))
        materials = config.get('materials') or {}
        variant = config.get('defaultVariant') or {}
        used = sorted({
            item.get('material')
            for item in variant.values()
            if not item.get('hide') and item.get('material')
        })

        model_path = destination / 'model.glb'
        document = glb_document(model_path.read_bytes())
        meshes = document.get('meshes') or []
        node_reports = {}
        for node in document.get('nodes') or []:
            node_name = node.get('name')
            mesh_index = node.get('mesh')
            if node_name not in variant or mesh_index is None or mesh_index >= len(meshes):
                continue
            mesh = meshes[mesh_index]
            primitives = []
            for primitive in mesh.get('primitives') or []:
                primitives.append({
                    'attributes': sorted((primitive.get('attributes') or {}).keys()),
                    'materialIndex': primitive.get('material'),
                    'mode': primitive.get('mode', 4),
                })
            node_reports[node_name] = {
                'meshName': mesh.get('name'),
                'primitives': primitives,
            }

        report = {
            'scale': config.get('scale'),
            'defaultVariant': variant,
            'usedMaterials': {name: materials.get(name) for name in used},
            'glbMaterials': document.get('materials') or [],
            'glbTextures': document.get('textures') or [],
            'glbImages': document.get('images') or [],
            'nodes': node_reports,
        }
        print('SQUIRTLE_MATERIAL_CONFIG', json.dumps(report, ensure_ascii=False, sort_keys=True))


if __name__ == '__main__':
    main()
