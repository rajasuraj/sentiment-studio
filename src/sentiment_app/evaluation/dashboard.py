"""Aggregate metrics and deployment recommendation for the dashboard."""

from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import pandas as pd


def text_length_histogram(
    lengths: List[int], bins: int = 12
) -> Dict[str, Any]:
    """Histogram data for charting (edges + counts)."""
    if not lengths:
        return {"edges": [], "counts": []}
    arr = np.array(lengths, dtype=float)
    counts, edges = np.histogram(arr, bins=bins)
    return {
        "edges": [float(x) for x in edges],
        "counts": [int(x) for x in counts],
    }


def build_deployment_recommendation(
    ml: Optional[Dict[str, Any]],
    dl: Optional[Dict[str, Any]],
) -> Dict[str, Any]:
    """
    Heuristic recommendation: prefer higher macro F1 when latency budget allows.
    """
    ml_ok = bool(ml and ml.get("macro_f1") is not None)
    dl_ok = bool(dl and dl.get("macro_f1") is not None)
    if not ml_ok and not dl_ok:
        return {
            "winner": "none",
            "summary": "Train at least one model to get a recommendation.",
            "rationale": [],
        }

    rationale: List[str] = []
    if ml_ok:
        rationale.append(
            f"ML macro F1={ml['macro_f1']:.3f}, "
            f"infer≈{ml.get('inference_ms_per_sample', 0):.2f} ms/sample, "
            f"size≈{ml.get('model_size_mb', 0):.2f} MB."
        )
    if dl_ok:
        rationale.append(
            f"DL macro F1={dl['macro_f1']:.3f}, "
            f"infer≈{dl.get('inference_ms_per_sample', 0):.2f} ms/sample, "
            f"size≈{dl.get('model_size_mb', 0):.2f} MB."
        )

    if ml_ok and dl_ok:
        f1_diff = float(dl["macro_f1"]) - float(ml["macro_f1"])
        lat_ratio = (dl.get("inference_ms_per_sample") or 1) / max(
            ml.get("inference_ms_per_sample") or 0.001, 0.001
        )
        if f1_diff > 0.02 and lat_ratio < 50:
            winner = "dl"
            summary = (
                "Transformer model shows meaningfully higher quality; "
                "use it if latency and footprint are acceptable."
            )
        elif f1_diff < -0.02:
            winner = "ml"
            summary = (
                "Classical ML is stronger on this dataset; prefer it for "
                "cost-effective deployment."
            )
        elif lat_ratio > 20:
            winner = "ml"
            summary = (
                "Scores are close; prefer the lighter TF-IDF pipeline for "
                "low-latency edge or API tiers."
            )
        else:
            winner = "dl"
            summary = (
                "Similar scores; transformer may generalize better—validate on "
                "a holdout domain before production."
            )
    elif ml_ok:
        winner, summary = "ml", "Only ML model trained; deploy TF-IDF baseline."
    else:
        winner, summary = "dl", "Only DL model trained; deploy transformer path."

    return {"winner": winner, "summary": summary, "rationale": rationale}


def build_dashboard_payload(
    workspace_root: str,
    dataset_stats_path: str,
    cleaned_csv_path: str,
    ml_metrics_path: str,
    dl_metrics_path: str,
) -> Dict[str, Any]:
    """Full JSON for dashboard page."""
    from sentiment_app.utils.helpers import load_json, resolve_path

    stats = load_json(dataset_stats_path)
    ml_raw = load_json(ml_metrics_path)
    dl_raw = load_json(dl_metrics_path)
    ml = ml_raw if ml_raw.get("labels") else None
    dl = dl_raw if dl_raw.get("labels") else None

    lengths: List[int] = []
    class_dist: Dict[str, int] = {}
    p = resolve_path(cleaned_csv_path)
    if p.exists():
        df = pd.read_csv(p)
        if "text" in df.columns:
            lengths = df["text"].astype(str).str.len().tolist()
        if "label" in df.columns:
            class_dist = df["label"].value_counts().to_dict()
            class_dist = {str(k): int(v) for k, v in class_dist.items()}

    hist = text_length_histogram(lengths)
    rec = build_deployment_recommendation(ml, dl)

    return {
        "workspace_root": workspace_root,
        "dataset_stats": stats,
        "class_distribution": class_dist,
        "text_length_histogram": hist,
        "ml_metrics": ml,
        "dl_metrics": dl,
        "deployment": rec,
    }
