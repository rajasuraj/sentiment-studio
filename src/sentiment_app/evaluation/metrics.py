"""Metrics, timing, and model size utilities."""

from __future__ import annotations

import os
import time
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Sequence

import numpy as np
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    f1_score,
    precision_recall_fscore_support,
)

PathLike = Path | str


def evaluate_classifier(
    y_true: Sequence[str],
    y_pred: Sequence[str],
    labels: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """Accuracy, per-class precision/recall/F1, confusion matrix."""
    labels = labels or sorted(set(y_true) | set(y_pred))
    acc = float(accuracy_score(y_true, y_pred))
    p, r, f, _ = precision_recall_fscore_support(
        y_true, y_pred, labels=labels, zero_division=0
    )
    cm = confusion_matrix(y_true, y_pred, labels=labels)
    per_class = {
        lab: {
            "precision": float(p[i]),
            "recall": float(r[i]),
            "f1": float(f[i]),
        }
        for i, lab in enumerate(labels)
    }
    macro_f1 = float(f1_score(y_true, y_pred, average="macro", zero_division=0))
    return {
        "accuracy": acc,
        "macro_f1": macro_f1,
        "per_class": per_class,
        "labels": labels,
        "confusion_matrix": cm.tolist(),
    }


def measure_model_size_mb(path: PathLike) -> float:
    """Total size of file or directory in MB."""
    p = Path(path)
    if p.is_file():
        return os.path.getsize(p) / (1024 * 1024)
    total = 0
    for root, _, files in os.walk(p):
        for f in files:
            total += os.path.getsize(os.path.join(root, f))
    return total / (1024 * 1024)


def time_inference_per_sample_ms(
    predict_fn: Callable[[List[str]], np.ndarray],
    texts: List[str],
    warmup: int = 2,
) -> float:
    """Average milliseconds per sample (sequential)."""
    if not texts:
        return 0.0
    for _ in range(min(warmup, len(texts))):
        predict_fn([texts[0]])
    times: List[float] = []
    for t in texts:
        t0 = time.perf_counter()
        predict_fn([t])
        times.append((time.perf_counter() - t0) * 1000.0)
    return float(np.mean(times))
