"""Train TF-IDF + linear classifier with GridSearchCV (callable from services)."""

from __future__ import annotations

import time
from collections import Counter
from typing import Any, Dict

import joblib
import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report
from sklearn.model_selection import GridSearchCV, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.svm import LinearSVC

from sentiment_app.evaluation.metrics import (
    evaluate_classifier,
    measure_model_size_mb,
    time_inference_per_sample_ms,
)
from sentiment_app.utils.helpers import resolve_path, save_json
from sentiment_app.utils.logging_config import get_logger

logger = get_logger(__name__)


def _build_classifier(cfg: Dict[str, Any]) -> Any:
    name = cfg.get("classifier", "logistic_regression")
    if name == "linear_svc":
        kw = cfg.get("linear_svc", {})
        return LinearSVC(**kw)
    kw = cfg.get("logistic_regression", {})
    return LogisticRegression(**kw)


def build_ml_pipeline(cfg: Dict[str, Any]) -> Pipeline:
    clf = _build_classifier(cfg)
    tfidf_kw = {
        "lowercase": cfg["tfidf"].get("lowercase", True),
        "strip_accents": cfg["tfidf"].get("strip_accents", "unicode"),
        "min_df": cfg["tfidf"].get("min_df", 1),
        "ngram_range": tuple(cfg["tfidf"].get("ngram_range", (1, 1))),
    }
    return Pipeline([("tfidf", TfidfVectorizer(**tfidf_kw)), ("clf", clf)])


def train_ml_model(cfg: Dict[str, Any]) -> Dict[str, Any]:
    """Fit GridSearchCV, persist artifacts, return metrics dict."""
    paths = cfg["paths"]
    data_path = resolve_path(paths["cleaned_dataset"])
    if not data_path.exists():
        raise FileNotFoundError(f"Cleaned dataset not found: {data_path}")

    df = pd.read_csv(data_path)
    X = df["text"].astype(str).tolist()
    y = df["label"].astype(str).tolist()

    cnt = Counter(y)
    strat = y if len(cnt) > 1 and min(cnt.values()) >= 2 else None
    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=cfg["test_size"],
        stratify=strat,
        random_state=cfg["random_state"],
    )

    pipe = build_ml_pipeline(cfg)
    grid = cfg["grid_search"]
    param_grid: Dict[str, Any] = {
        "tfidf__max_features": grid["tfidf__max_features"],
        "tfidf__ngram_range": [tuple(x) for x in grid["tfidf__ngram_range"]],
        "clf__C": grid["clf__C"],
    }

    t0 = time.perf_counter()
    gs = GridSearchCV(
        pipe,
        param_grid,
        cv=cfg.get("cv_folds", 3),
        scoring="f1_macro",
        n_jobs=-1,
        refit=True,
    )
    gs.fit(X_train, y_train)
    train_time = time.perf_counter() - t0
    logger.info("Best params: %s", gs.best_params_)

    best: Pipeline = gs.best_estimator_
    y_pred = best.predict(X_test)
    metrics = evaluate_classifier(y_test, y_pred)
    metrics["training_time_seconds"] = train_time
    metrics["best_cv_score"] = float(gs.best_score_)
    bench = min(len(X_test), int(cfg.get("inference_benchmark_samples", 120)))
    infer_subset = X_test[:bench]
    metrics["inference_ms_per_sample"] = time_inference_per_sample_ms(
        lambda texts: np.array(best.predict(texts)), infer_subset
    )
    logger.info("%s", classification_report(y_test, y_pred))

    out_dir = resolve_path(paths["model_output"]).parent
    out_dir.mkdir(parents=True, exist_ok=True)
    model_path = resolve_path(paths["model_output"])
    vec_path = resolve_path(paths["vectorizer_output"])
    joblib.dump(best, model_path)
    joblib.dump(best.named_steps["tfidf"], vec_path)
    metrics["model_size_mb"] = float(
        measure_model_size_mb(model_path) + measure_model_size_mb(vec_path)
    )

    metrics_path = resolve_path(paths.get("metrics_output", "data/workspace/ml_metrics.json"))
    save_json(metrics, metrics_path)
    metrics["_saved_metrics_path"] = str(metrics_path)
    return metrics
