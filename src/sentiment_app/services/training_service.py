"""Train ML and DL models using workspace paths and centralized config."""

from __future__ import annotations

from typing import Any, Dict

from sentiment_app.exceptions import NotReadyError, TrainingError
from sentiment_app.models.train_dl_core import train_dl_model
from sentiment_app.models.train_ml_core import train_ml_model
from sentiment_app.services import prediction_service as pred
from sentiment_app.services import workspace as ws
from sentiment_app.utils.logging_config import get_logger, log_event

logger = get_logger(__name__)


def train_ml() -> Dict[str, Any]:
    if not ws.read_manifest().get("cleaned"):
        raise NotReadyError("Run /api/clean before training.")
    try:
        log_event(logger, "training.ml.start")
        cfg = ws.ml_training_config()
        metrics = train_ml_model(cfg)
        ws.merge_manifest({"ml_trained": True})
        pred.clear_model_cache()
        log_event(
            logger,
            "training.ml.complete",
            macro_f1=metrics.get("macro_f1"),
            accuracy=metrics.get("accuracy"),
        )
        return metrics
    except FileNotFoundError as e:
        raise NotReadyError(str(e)) from e
    except NotReadyError:
        raise
    except Exception as e:
        log_event(logger, "training.ml.failed", error=str(e))
        raise TrainingError(str(e)) from e


def train_dl() -> Dict[str, Any]:
    if not ws.read_manifest().get("cleaned"):
        raise NotReadyError("Run /api/clean before training.")
    try:
        log_event(logger, "training.dl.start")
        cfg = ws.dl_training_config()
        metrics = train_dl_model(cfg)
        ws.merge_manifest({"dl_trained": True})
        pred.clear_model_cache()
        log_event(
            logger,
            "training.dl.complete",
            macro_f1=metrics.get("macro_f1"),
            accuracy=metrics.get("accuracy"),
        )
        return metrics
    except FileNotFoundError as e:
        raise NotReadyError(str(e)) from e
    except NotReadyError:
        raise
    except Exception as e:
        log_event(logger, "training.dl.failed", error=str(e))
        raise TrainingError(str(e)) from e
