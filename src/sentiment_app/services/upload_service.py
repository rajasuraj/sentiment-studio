"""Persist raw CSV uploads and return column metadata."""

from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, Optional

import pandas as pd
from fastapi import UploadFile

from sentiment_app.exceptions import PayloadTooLargeError, ValidationError
from sentiment_app.services import prediction_service as pred
from sentiment_app.services import workspace as ws
from sentiment_app.settings import get_settings
from sentiment_app.utils.logging_config import get_logger, log_event

logger = get_logger(__name__)

_CHUNK = 1024 * 1024


def _upload_file_present(up: Optional[UploadFile]) -> bool:
    if up is None:
        return False
    fn = getattr(up, "filename", None)
    return bool(fn and str(fn).strip())


async def _save_upload_stream(up: UploadFile, dest: Path, max_b: int) -> None:
    """Write upload to disk and enforce max size (works when ``size`` is unknown)."""
    sz = getattr(up, "size", None)
    if sz is not None and sz > max_b:
        log_event(
            logger,
            "upload.rejected",
            reason="payload_too_large",
            max_bytes=max_b,
            reported_size=sz,
        )
        raise PayloadTooLargeError(
            f"File exceeds maximum upload size ({max_b // (1024 * 1024)} MB)."
        )
    total = 0
    with dest.open("wb") as out:
        while True:
            block = await up.read(_CHUNK)
            if not block:
                break
            total += len(block)
            if total > max_b:
                log_event(
                    logger,
                    "upload.rejected",
                    reason="payload_too_large_stream",
                    max_bytes=max_b,
                    bytes_read=total,
                )
                raise PayloadTooLargeError(
                    f"File exceeds maximum upload size ({max_b // (1024 * 1024)} MB)."
                )
            out.write(block)


async def store_datasets(
    file_a: UploadFile,
    file_b: Optional[UploadFile] = None,
) -> Dict[str, Any]:
    """
    Save one or two CSVs to workspace uploads, reset manifest flags, return previews.

    When only ``file_a`` is provided, ``dataset_b`` is removed from the workspace
    (if present) so cleaning runs on a single merged source.
    """
    settings = get_settings()
    max_b = settings.max_upload_bytes()
    paths = settings.paths()
    paths.upload_a.parent.mkdir(parents=True, exist_ok=True)

    await _save_upload_stream(file_a, paths.upload_a, max_b)

    dual = _upload_file_present(file_b)
    if dual:
        assert file_b is not None
        await _save_upload_stream(file_b, paths.upload_b, max_b)
    else:
        paths.upload_b.unlink(missing_ok=True)

    try:
        df_a = pd.read_csv(paths.upload_a)
        df_b = pd.read_csv(paths.upload_b) if dual else None
    except Exception as e:
        log_event(logger, "upload.parse_failed", error=str(e))
        raise ValidationError(f"Could not parse CSV: {e}") from e

    ws.merge_manifest(
        {
            "upload_a": True,
            "upload_b": dual,
            "cleaned": False,
            "ml_trained": False,
            "dl_trained": False,
        }
    )
    pred.clear_model_cache()

    rows_b = int(len(df_b)) if df_b is not None else 0
    cols_b = list(df_b.columns.astype(str)) if df_b is not None else []

    log_event(
        logger,
        "upload.stored",
        rows_a=int(len(df_a)),
        rows_b=rows_b,
        path_a=str(paths.upload_a),
        path_b=str(paths.upload_b) if dual else None,
        dual=dual,
    )

    return {
        "status": "ok",
        "upload_mode": "dual" if dual else "single",
        "columns_a": list(df_a.columns.astype(str)),
        "columns_b": cols_b,
        "rows_a": int(len(df_a)),
        "rows_b": rows_b,
    }


# Backwards-compatible name for tests / imports
async def store_two_datasets(
    file_a: UploadFile,
    file_b: Optional[UploadFile] = None,
) -> Dict[str, Any]:
    return await store_datasets(file_a, file_b)
