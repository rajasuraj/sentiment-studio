"""Path and config helpers."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, Union

import yaml

PathLike = Union[str, Path]


def project_root() -> Path:
    """Repository root (parent of `src`)."""
    return Path(__file__).resolve().parents[3]


def resolve_path(path: PathLike) -> Path:
    """Resolve a path relative to project root if not absolute."""
    p = Path(path)
    if p.is_absolute():
        return p
    return project_root() / p


def load_yaml(path: PathLike) -> Dict[str, Any]:
    """Load YAML config."""
    with open(resolve_path(path), encoding="utf-8") as f:
        data = yaml.safe_load(f)
    return data if isinstance(data, dict) else {}


def save_json(data: Dict[str, Any], path: PathLike) -> None:
    """Write JSON with UTF-8."""
    out = resolve_path(path)
    out.parent.mkdir(parents=True, exist_ok=True)
    with open(out, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def load_json(path: PathLike) -> Dict[str, Any]:
    p = resolve_path(path)
    if not p.exists():
        return {}
    with open(p, encoding="utf-8") as f:
        return json.load(f)
