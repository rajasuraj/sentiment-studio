"""Orchestrate model inference and persistence (used by API layer)."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from sentiment_app.database.sqlite import log_prediction
from sentiment_app.exceptions import InferenceError, ModelNotAvailableError
from sentiment_app.services import prediction_service as pred
from sentiment_app.settings import get_settings
from sentiment_app.utils.logging_config import get_logger, log_event

logger = get_logger(__name__)


@dataclass(frozen=True)
class PredictionResult:
    prediction: str
    model: str
    inference_time_ms: float


def _dl_ready(model_dir: Path) -> bool:
    return (model_dir / "config.json").exists()


def run_ml_prediction(text: str) -> PredictionResult:
    paths = get_settings().paths()
    if not paths.ml_model.exists():
        raise ModelNotAvailableError("ML model not trained yet.")
    try:
        label, ms = pred.predict_ml(text)
    except Exception as e:
        log_event(logger, "predict.ml.error", error=str(e))
        raise InferenceError(str(e)) from e
    log_prediction(str(paths.sqlite_db), text, label, "ml", ms)
    log_event(logger, "predict.ml.ok", latency_ms=round(ms, 3))
    return PredictionResult(prediction=label, model="ml", inference_time_ms=ms)


def run_dl_prediction(text: str) -> PredictionResult:
    paths = get_settings().paths()
    if not _dl_ready(paths.dl_model_dir):
        raise ModelNotAvailableError("DL model not trained yet.")
    try:
        label, ms = pred.predict_dl(text)
    except Exception as e:
        log_event(logger, "predict.dl.error", error=str(e))
        raise InferenceError(str(e)) from e
    log_prediction(str(paths.sqlite_db), text, label, "dl", ms)
    log_event(logger, "predict.dl.ok", latency_ms=round(ms, 3))
    return PredictionResult(prediction=label, model="dl", inference_time_ms=ms)
