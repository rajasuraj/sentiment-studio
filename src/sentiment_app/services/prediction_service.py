"""Lazy-loaded models for inference."""

from __future__ import annotations

import time
from typing import Any, Dict, Optional, Tuple

import torch

from sentiment_app.models.inference import (
    load_dl_artifacts,
    load_ml_pipeline,
    predict_dl_single,
)
from sentiment_app.settings import get_settings

_ml_pipe: Any = None
_dl_pack: Optional[Dict[str, Any]] = None


def clear_model_cache() -> None:
    global _ml_pipe, _dl_pack
    _ml_pipe = None
    _dl_pack = None


def _dl_max_length() -> int:
    cfg = get_settings().dl_training_config()
    return int(cfg.get("model", {}).get("max_length", 128))


def get_ml_pipeline():
    global _ml_pipe
    if _ml_pipe is None:
        p = get_settings().paths().ml_model
        _ml_pipe = load_ml_pipeline(str(p))
    return _ml_pipe


def get_dl_pack() -> Dict[str, Any]:
    global _dl_pack
    if _dl_pack is None:
        paths = get_settings().paths()
        device = "cuda" if torch.cuda.is_available() else "cpu"
        model, tok, id2lab, dev = load_dl_artifacts(
            paths.dl_model_dir, paths.label_map, device=device
        )
        _dl_pack = {
            "model": model,
            "tokenizer": tok,
            "id2label": id2lab,
            "device": dev,
            "max_length": _dl_max_length(),
        }
    return _dl_pack


def predict_ml(text: str) -> Tuple[str, float]:
    pipe = get_ml_pipeline()
    t0 = time.perf_counter()
    pred = str(pipe.predict([text])[0])
    ms = (time.perf_counter() - t0) * 1000.0
    return pred, ms


def predict_dl(text: str) -> Tuple[str, float]:
    pack = get_dl_pack()
    t0 = time.perf_counter()
    pred = predict_dl_single(
        pack["model"],
        pack["tokenizer"],
        pack["id2label"],
        pack["device"],
        text,
        max_length=pack["max_length"],
    )
    ms = (time.perf_counter() - t0) * 1000.0
    return pred, ms
