"""Workspace paths, manifest, and training config — backed by centralized settings."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict

from sentiment_app.settings import get_settings
from sentiment_app.utils.logging_config import get_logger

logger = get_logger(__name__)


def load_app_config() -> Dict[str, Any]:
    return get_settings().app


def workspace_dir() -> Path:
    return get_settings().workspace_root


def uploads_dir() -> Path:
    p = get_settings().paths().upload_a.parent
    p.mkdir(parents=True, exist_ok=True)
    return p


def manifest_path() -> Path:
    return workspace_dir() / "manifest.json"


def read_manifest() -> Dict[str, Any]:
    p = manifest_path()
    if not p.exists():
        return {}
    with open(p, encoding="utf-8") as f:
        return json.load(f)


def write_manifest(data: Dict[str, Any]) -> None:
    workspace_dir().mkdir(parents=True, exist_ok=True)
    with open(manifest_path(), "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)


def merge_manifest(updates: Dict[str, Any]) -> Dict[str, Any]:
    m = read_manifest()
    m.update(updates)
    write_manifest(m)
    return m


def db_path() -> Path:
    return get_settings().paths().sqlite_db


def paths_bundle() -> Dict[str, str]:
    """Resolved absolute paths (string) for workspace artifacts."""
    return get_settings().paths().as_str_dict()


def ml_training_config() -> Dict[str, Any]:
    return get_settings().ml_training_config()


def dl_training_config() -> Dict[str, Any]:
    return get_settings().dl_training_config()
