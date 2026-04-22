"""Shared inference helpers."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, Tuple

import joblib
import numpy as np
import torch
from transformers import AutoModelForSequenceClassification, AutoTokenizer

from sentiment_app.utils.helpers import resolve_path


def load_ml_pipeline(path: str | Path):
    return joblib.load(resolve_path(path))


def predict_ml_batch(pipeline: Any, texts: list[str]) -> np.ndarray:
    return np.array(pipeline.predict(texts))


def load_dl_artifacts(
    model_dir: str | Path,
    label_map_path: str | Path,
    device: str | torch.device = "cpu",
) -> Tuple[torch.nn.Module, Any, Dict[int, str], torch.device]:
    mdir = resolve_path(model_dir)
    with open(resolve_path(label_map_path), encoding="utf-8") as f:
        meta = json.load(f)
    id2label = {int(k): v for k, v in meta["id2label"].items()}
    tok = AutoTokenizer.from_pretrained(str(mdir))
    model = AutoModelForSequenceClassification.from_pretrained(str(mdir))
    dev = torch.device(device)
    model.to(dev)
    model.eval()
    return model, tok, id2label, dev


@torch.no_grad()
def predict_dl_batch(
    model: torch.nn.Module,
    tokenizer: Any,
    id2label: Dict[int, str],
    device: torch.device,
    texts: list[str],
    max_length: int = 128,
) -> list[str]:
    enc = tokenizer(
        texts,
        padding=True,
        truncation=True,
        max_length=max_length,
        return_tensors="pt",
    )
    enc = {k: v.to(device) for k, v in enc.items()}
    logits = model(**enc).logits
    pred_ids = logits.argmax(dim=-1).tolist()
    return [id2label[i] for i in pred_ids]


def predict_dl_single(
    model: torch.nn.Module,
    tokenizer: Any,
    id2label: Dict[int, str],
    device: torch.device,
    text: str,
    max_length: int = 128,
) -> str:
    return predict_dl_batch(
        model, tokenizer, id2label, device, [text], max_length=max_length
    )[0]
