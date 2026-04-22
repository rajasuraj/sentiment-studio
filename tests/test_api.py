"""API tests (thin routes + AppError JSON shape)."""

from __future__ import annotations

from fastapi.testclient import TestClient

from sentiment_app.api.main import create_app


def test_healthcheck(workspace_tmp) -> None:
    with TestClient(create_app()) as c:
        r = c.get("/healthcheck")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_metrics_shape(workspace_tmp) -> None:
    with TestClient(create_app()) as c:
        r = c.get("/api/metrics")
    assert r.status_code == 200
    body = r.json()
    assert "dataset_stats" in body
    assert "deployment" in body
    assert "text_length_histogram" in body


def test_manifest(workspace_tmp) -> None:
    with TestClient(create_app()) as c:
        r = c.get("/api/manifest")
    assert r.status_code == 200
    assert isinstance(r.json(), dict)


def test_predict_ml_model_unavailable(workspace_tmp) -> None:
    with TestClient(create_app()) as c:
        r = c.post("/api/predict-ml", json={"text": "hello world"})
    assert r.status_code == 503
    detail = r.json()["detail"]
    assert detail["code"] == "model_unavailable"
    assert "message" in detail


def test_clean_not_ready_without_uploads(workspace_tmp) -> None:
    with TestClient(create_app()) as c:
        r = c.post(
            "/api/clean",
            json={
                "dataset_a": {"text_column": "text", "label_column": "label"},
                "dataset_b": {"text_column": "text", "label_column": "label"},
            },
        )
    assert r.status_code == 400
    detail = r.json()["detail"]
    assert detail["code"] == "not_ready"


def test_upload_single_file_returns_mode_single(workspace_tmp) -> None:
    with TestClient(create_app()) as c:
        r = c.post(
            "/api/upload",
            files={
                "file_a": (
                    "one.csv",
                    b"text,label\nhello,pos\n",
                    "text/csv",
                ),
            },
        )
    assert r.status_code == 200
    body = r.json()
    assert body["upload_mode"] == "single"
    assert body["rows_a"] == 1
    assert body["rows_b"] == 0


def test_clean_single_file_after_upload(workspace_tmp) -> None:
    with TestClient(create_app()) as c:
        up = c.post(
            "/api/upload",
            files={"file_a": ("a.csv", b"text,label\nx,pos\n", "text/csv")},
        )
        assert up.status_code == 200
        cl = c.post(
            "/api/clean",
            json={"dataset_a": {"text_column": "text", "label_column": "label"}},
        )
    assert cl.status_code == 200
    data = cl.json()
    assert data["rows"] >= 1
    assert "dataset_stats" in data
