"""Centralized configuration: YAML + environment overrides."""

from __future__ import annotations

import os
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict

from sentiment_app.utils.helpers import load_yaml, resolve_path

DEFAULT_APP_CONFIG = "src/config/app.yaml"


def _env_path(key: str, default: str) -> str:
    return os.environ.get(key, default).strip()


@dataclass(frozen=True)
class ResolvedPaths:
    """Absolute workspace artifact paths."""

    workspace: Path
    upload_a: Path
    upload_b: Path
    cleaned_csv: Path
    dataset_stats: Path
    label_map: Path
    ml_model: Path
    ml_vectorizer: Path
    ml_metrics: Path
    dl_model_dir: Path
    dl_metrics: Path
    sqlite_db: Path

    def as_str_dict(self) -> Dict[str, str]:
        return {
            "workspace": str(self.workspace),
            "upload_a": str(self.upload_a),
            "upload_b": str(self.upload_b),
            "cleaned_csv": str(self.cleaned_csv),
            "dataset_stats": str(self.dataset_stats),
            "label_map": str(self.label_map),
            "ml_model": str(self.ml_model),
            "ml_vectorizer": str(self.ml_vectorizer),
            "ml_metrics": str(self.ml_metrics),
            "dl_model_dir": str(self.dl_model_dir),
            "dl_metrics": str(self.dl_metrics),
            "sqlite_db": str(self.sqlite_db),
        }


class AppSettings:
    """Loaded application + training template configs."""

    def __init__(self, app_dict: Dict[str, Any], workspace_root: Path) -> None:
        self._app = app_dict
        self.workspace_root = workspace_root
        rel = (app_dict.get("paths") or {}) if isinstance(app_dict.get("paths"), dict) else {}
        self._path_rel: Dict[str, str] = {
            "upload_a": rel.get("upload_a", "uploads/dataset_a.csv"),
            "upload_b": rel.get("upload_b", "uploads/dataset_b.csv"),
            "cleaned_csv": rel.get("cleaned_csv", "cleaned_dataset.csv"),
            "dataset_stats": rel.get("dataset_stats", "dataset_stats.json"),
            "label_map": rel.get("label_map", "label_map.json"),
            "ml_model": rel.get("ml_model", "models/ml/model_ml.pkl"),
            "ml_vectorizer": rel.get("ml_vectorizer", "models/ml/vectorizer.pkl"),
            "ml_metrics": rel.get("ml_metrics", "ml_metrics.json"),
            "dl_model_dir": rel.get("dl_model_dir", "models/dl/transformer"),
            "dl_metrics": rel.get("dl_metrics", "dl_metrics.json"),
            "sqlite_db": rel.get("sqlite_db", "predictions.db"),
        }
        cf = app_dict.get("config_files") or {}
        self.ml_config_path = _env_path(
            "SENTIMENT_ML_CONFIG", str(cf.get("ml", "src/config/ml_config.yaml"))
        )
        self.dl_config_path = _env_path(
            "SENTIMENT_DL_CONFIG", str(cf.get("dl", "src/config/dl_config.yaml"))
        )

    @property
    def app(self) -> Dict[str, Any]:
        return self._app

    def paths(self) -> ResolvedPaths:
        root = self.workspace_root
        p = self._path_rel
        return ResolvedPaths(
            workspace=root,
            upload_a=root / p["upload_a"],
            upload_b=root / p["upload_b"],
            cleaned_csv=root / p["cleaned_csv"],
            dataset_stats=root / p["dataset_stats"],
            label_map=root / p["label_map"],
            ml_model=root / p["ml_model"],
            ml_vectorizer=root / p["ml_vectorizer"],
            ml_metrics=root / p["ml_metrics"],
            dl_model_dir=root / p["dl_model_dir"],
            dl_metrics=root / p["dl_metrics"],
            sqlite_db=root / p["sqlite_db"],
        )

    def max_upload_bytes(self) -> int:
        mb = float(self._app.get("upload", {}).get("max_upload_mb", 50))
        return int(mb * 1024 * 1024)

    def upload_max_rows_per_dataset(self) -> int | None:
        """First N rows kept per CSV after upload; None means no cap."""
        env = os.environ.get("SENTIMENT_UPLOAD_MAX_ROWS", "").strip()
        raw: object
        if env != "":
            try:
                raw = int(env)
            except ValueError:
                raw = self._app.get("upload", {}).get("max_rows_per_dataset", 500)
        else:
            raw = self._app.get("upload", {}).get("max_rows_per_dataset", 500)
        if raw is None:
            return None
        n = int(raw)
        return None if n <= 0 else n

    def log_level(self) -> str:
        return str(self._app.get("logging", {}).get("level", "INFO")).upper()

    def structured_logging(self) -> bool:
        return bool(self._app.get("logging", {}).get("structured", True))

    def ml_training_config(self) -> Dict[str, Any]:
        cfg = load_yaml(self.ml_config_path)
        pb = self.paths().as_str_dict()
        cfg["paths"] = {
            "cleaned_dataset": pb["cleaned_csv"],
            "model_output": pb["ml_model"],
            "vectorizer_output": pb["ml_vectorizer"],
            "metrics_output": pb["ml_metrics"],
        }
        return cfg

    def dl_training_config(self) -> Dict[str, Any]:
        cfg = load_yaml(self.dl_config_path)
        pb = self.paths().as_str_dict()
        cfg["paths"] = {
            "cleaned_dataset": pb["cleaned_csv"],
            "model_dir": pb["dl_model_dir"],
            "label_map": pb["label_map"],
            "metrics_output": pb["dl_metrics"],
        }
        return cfg


def _workspace_root_from_env(app_yaml: Dict[str, Any]) -> Path:
    env_root = os.environ.get("SENTIMENT_WORKSPACE_ROOT")
    if env_root:
        return resolve_path(env_root)
    default = app_yaml.get("workspace_root", "data/workspace")
    return resolve_path(str(default))


@lru_cache(maxsize=1)
def get_settings() -> AppSettings:
    """Singleton settings (clear cache in tests via reset_settings_cache)."""
    path = _env_path("SENTIMENT_APP_CONFIG", DEFAULT_APP_CONFIG)
    app_dict = load_yaml(path)
    root = _workspace_root_from_env(app_dict)
    return AppSettings(app_dict, root)


def reset_settings_cache() -> None:
    """Reload YAML from disk (tests, reload)."""
    get_settings.cache_clear()
