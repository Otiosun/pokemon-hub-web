from __future__ import annotations

import json
import urllib.request

import UnityPy

STARTERS = [
    ("001", "Bulbasaur", "1ob8kkVaOeaVhx3Yer8araVjyRsWIaoPq"),
    ("004", "Charmander", "1oQlfpTSHcurqC-uUjXOpd50fyfa-t7nf"),
    ("007", "Squirtle", "1o3dihw_MQscSPhw4L2XKOZ00pr_GWVyY"),
]

INTERESTING = {
    "AnimationClip",
    "AnimatorController",
    "Animator",
    "Avatar",
    "SkinnedMeshRenderer",
    "Mesh",
    "Texture2D",
    "GameObject",
    "AssetBundle",
}


def download(file_id: str) -> bytes:
    urls = [
        f"https://drive.usercontent.google.com/download?id={file_id}&export=download&confirm=t",
        f"https://drive.google.com/uc?export=download&id={file_id}",
    ]
    last_error: Exception | None = None
    for url in urls:
        try:
            request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(request, timeout=30) as response:
                data = response.read()
            if not data.startswith(b"UnityFS"):
                raise RuntimeError(f"unexpected payload: {data[:16]!r}")
            return data
        except Exception as exc:  # research diagnostics
            last_error = exc
    raise RuntimeError("bundle download failed") from last_error


def safe_read(obj):
    try:
        return obj.read()
    except Exception as exc:
        return exc


def scalar(value):
    if isinstance(value, (str, int, float, bool)) or value is None:
        return value
    return None


for dex, name, file_id in STARTERS:
    print(f"\nHOME_UNITYPY #{dex} {name}")
    raw = download(file_id)
    print(f"downloaded={len(raw)} signature=UnityFS")
    env = UnityPy.load(raw)

    counts: dict[str, int] = {}
    by_type: dict[str, list] = {}
    for obj in env.objects:
        type_name = obj.type.name
        counts[type_name] = counts.get(type_name, 0) + 1
        if type_name in INTERESTING:
            by_type.setdefault(type_name, []).append(obj)

    print("stats=", json.dumps(dict(sorted(counts.items())), ensure_ascii=False))

    for type_name in sorted(by_type):
        objects = by_type[type_name]
        print(f"{type_name}={len(objects)}")
        for obj in objects[:80]:
            data = safe_read(obj)
            if isinstance(data, Exception):
                print(json.dumps({"path_id": obj.path_id, "parse_error": str(data)}, ensure_ascii=False))
                continue

            item = {
                "path_id": obj.path_id,
                "name": getattr(data, "m_Name", None),
            }
            if type_name == "AnimationClip":
                for attr in (
                    "m_SampleRate",
                    "m_StartTime",
                    "m_StopTime",
                    "m_WrapMode",
                    "m_Legacy",
                ):
                    if hasattr(data, attr):
                        item[attr] = scalar(getattr(data, attr))
                if item.get("m_StartTime") is not None and item.get("m_StopTime") is not None:
                    item["duration"] = round(item["m_StopTime"] - item["m_StartTime"], 4)
            print(json.dumps(item, ensure_ascii=False, default=str))
