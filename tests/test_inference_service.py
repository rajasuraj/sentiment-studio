"""Tests for inference orchestration (services layer)."""

from __future__ import annotations

import joblib
import pytest
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline

from sentiment_app.database.sqlite import init_db
from sentiment_app.exceptions import InferenceError, ModelNotAvailableError
from sentiment_app.services import inference_service as inf
from sentiment_app.services import prediction_service as pred
from sentiment_app.settings import get_settings


def test_run_ml_raises_when_model_missing(workspace_tmp, monkeypatch) -> None:
    paths = get_settings().paths()
    if paths.ml_model.exists():
        paths.ml_model.unlink()
    pred.clear_model_cache()
    with pytest.raises(ModelNotAvailableError) as ei:
        inf.run_ml_prediction("hello")
    assert "not trained" in ei.value.message.lower()


def test_run_ml_success_with_trained_joblib(workspace_tmp) -> None:
    paths = get_settings().paths()
    paths.ml_model.parent.mkdir(parents=True, exist_ok=True)
    pipe = Pipeline(
        [
            ("vec", CountVectorizer()),
            ("clf", LogisticRegression(max_iter=200)),
        ]
    )
    pipe.fit(["good bad", "bad good"], ["pos", "neg"])
    joblib.dump(pipe, paths.ml_model)
    pred.clear_model_cache()
    init_db(paths.sqlite_db)
    out = inf.run_ml_prediction("good")
    assert out.model == "ml"
    assert out.prediction in ("pos", "neg")
    assert out.inference_time_ms >= 0.0


def test_run_ml_inference_error_wraps(workspace_tmp, monkeypatch) -> None:
    paths = get_settings().paths()
    paths.ml_model.parent.mkdir(parents=True, exist_ok=True)
    paths.ml_model.touch()
    pred.clear_model_cache()

    def boom(_: str):
        raise RuntimeError("simulated failure")

    monkeypatch.setattr(pred, "predict_ml", boom)
    with pytest.raises(InferenceError) as ei:
        inf.run_ml_prediction("x")
    assert "simulated" in ei.value.message.lower()


def test_run_dl_raises_when_bundle_not_ready(workspace_tmp) -> None:
    paths = get_settings().paths()
    paths.dl_model_dir.mkdir(parents=True, exist_ok=True)
    cfg = paths.dl_model_dir / "config.json"
    if cfg.exists():
        cfg.unlink()
    pred.clear_model_cache()
    with pytest.raises(ModelNotAvailableError):
        inf.run_dl_prediction("hello")


def test_run_dl_success_monkeypatch(workspace_tmp, monkeypatch) -> None:
    paths = get_settings().paths()
    paths.dl_model_dir.mkdir(parents=True, exist_ok=True)
    (paths.dl_model_dir / "config.json").write_text("{}", encoding="utf-8")
    pred.clear_model_cache()
    monkeypatch.setattr(pred, "predict_dl", lambda _t: ("pos", 2.5))
    init_db(paths.sqlite_db)
    out = inf.run_dl_prediction("fine")
    assert out.model == "dl"
    assert out.prediction == "pos"
    assert out.inference_time_ms == 2.5
