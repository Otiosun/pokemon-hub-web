from pathlib import Path

try:
    import py7zr.py7zr as py7zr_module

    _original = py7zr_module.get_sanitized_output_path

    def _safe_output_path(fname, path):
        if not fname or not str(fname).strip():
            return Path(path or ".") / "__empty_pk_member__"
        return _original(fname, path)

    py7zr_module.get_sanitized_output_path = _safe_output_path
except Exception:
    pass
