"""Load uploaded CSVs, unify columns, clean, save stats."""

from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, Optional

import pandas as pd

from sentiment_app.exceptions import NotReadyError, ValidationError
from sentiment_app.preprocessing.cleaning import preprocess_dataframe
from sentiment_app.services import workspace as ws
from sentiment_app.utils.helpers import save_json
from sentiment_app.utils.logging_config import get_logger, log_event

logger = get_logger(__name__)


def _dataset_stats(df: pd.DataFrame, text_col: str, label_col: str) -> Dict[str, Any]:
    lengths = df[text_col].astype(str).str.len()
    dist = df[label_col].value_counts().to_dict()
    return {
        "total_samples": int(len(df)),
        "class_distribution": {str(k): int(v) for k, v in dist.items()},
        "average_text_length_chars": float(lengths.mean()),
        "min_text_length_chars": int(lengths.min()),
        "max_text_length_chars": int(lengths.max()),
    }


def run_cleaning(
    mapping_a: Dict[str, str],
    mapping_b: Optional[Dict[str, str]] = None,
) -> Dict[str, Any]:
    """
    mapping_a: {"text_column": "...", "label_column": "..."}
    mapping_b: same shape when two datasets were uploaded; omit or None for single.
    """
    pb = ws.paths_bundle()
    path_a = Path(pb["upload_a"])
    path_b = Path(pb["upload_b"])
    manifest = ws.read_manifest()
    dual = bool(manifest.get("upload_b"))

    if not path_a.exists():
        log_event(logger, "cleaning.blocked", reason="upload_a_missing")
        raise NotReadyError("Upload dataset A (CSV) first.")

    tc_a, lc_a = mapping_a.get("text_column"), mapping_a.get("label_column")
    if not all([tc_a, lc_a]):
        raise ValidationError("Dataset A: text and label column mappings are required.")

    if dual:
        if not path_b.exists():
            log_event(logger, "cleaning.blocked", reason="upload_b_missing")
            raise NotReadyError("Upload dataset B or re-upload with a single file only.")
        if not mapping_b:
            raise ValidationError("Dataset B column mappings are required when two files were uploaded.")
        tc_b, lc_b = mapping_b.get("text_column"), mapping_b.get("label_column")
        if not all([tc_b, lc_b]):
            raise ValidationError("Dataset B: text and label column mappings are required.")

        df_a = pd.read_csv(path_a)
        df_b = pd.read_csv(path_b)
        for name, df, tc, lc in (
            ("dataset_a", df_a, tc_a, lc_a),
            ("dataset_b", df_b, tc_b, lc_b),
        ):
            missing = [c for c in (tc, lc) if c not in df.columns]
            if missing:
                raise ValidationError(f"{name}: missing columns {missing}")

        a = df_a[[tc_a, lc_a]].rename(columns={tc_a: "text", lc_a: "label"})
        a["source"] = "dataset_a"
        b = df_b[[tc_b, lc_b]].rename(columns={tc_b: "text", lc_b: "label"})
        b["source"] = "dataset_b"
        raw = pd.concat([a, b], ignore_index=True)
    else:
        df_a = pd.read_csv(path_a)
        missing = [c for c in (tc_a, lc_a) if c not in df_a.columns]
        if missing:
            raise ValidationError(f"dataset_a: missing columns {missing}")
        raw = df_a[[tc_a, lc_a]].rename(columns={tc_a: "text", lc_a: "label"})
        raw["source"] = "dataset_a"

    cleaned = preprocess_dataframe(
        raw, "text", "label", drop_duplicates=True, extra_columns=("source",)
    )
    out_csv = Path(pb["cleaned_csv"])
    out_csv.parent.mkdir(parents=True, exist_ok=True)
    cleaned.to_csv(out_csv, index=False)

    stats = _dataset_stats(cleaned, "text", "label")
    save_json(stats, pb["dataset_stats"])
    ws.merge_manifest({"cleaned": True, "rows_cleaned": len(cleaned)})

    log_event(
        logger,
        "cleaning.complete",
        rows=int(len(cleaned)),
        output=str(out_csv),
        dual=dual,
    )

    return {"rows": len(cleaned), "dataset_stats": stats, "path": str(out_csv)}
