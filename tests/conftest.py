"""Shared pytest fixtures."""

from __future__ import annotations

import pytest

from sentiment_app.database.sqlite import init_db
from sentiment_app.services import prediction_service as pred
from sentiment_app.services import workspace as ws
from sentiment_app.settings import reset_settings_cache


@pytest.fixture(autouse=True)
def reset_settings_cache_each_test():
    reset_settings_cache()
    yield
    reset_settings_cache()
    pred.clear_model_cache()


@pytest.fixture
def workspace_tmp(monkeypatch: pytest.MonkeyPatch, tmp_path):
    """Isolated workspace root + DB init (matches API lifespan expectations)."""
    monkeypatch.setenv("SENTIMENT_WORKSPACE_ROOT", str(tmp_path))
    reset_settings_cache()
    ws.workspace_dir().mkdir(parents=True, exist_ok=True)
    ws.uploads_dir()
    init_db(ws.db_path())
    yield tmp_path
    pred.clear_model_cache()
    reset_settings_cache()
