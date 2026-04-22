"""Thin REST API routes — business logic lives in services."""

from __future__ import annotations

from typing import Any, Dict, Optional

from fastapi import APIRouter, File, UploadFile

from sentiment_app.api.schemas import (
    CleanRequest,
    PredictRequest,
    PredictResponse,
    TrainResponse,
    UploadResponse,
)
from sentiment_app.database.sqlite import fetch_logs
from sentiment_app.services import cleaning_service, inference_service, metrics_service
from sentiment_app.services import training_service
from sentiment_app.services import upload_service
from sentiment_app.services import workspace as ws

router = APIRouter(prefix="/api")


@router.post("/upload", response_model=UploadResponse)
async def upload_datasets(
    file_a: UploadFile = File(..., description="First CSV dataset (required)"),
    file_b: Optional[UploadFile] = File(
        None, description="Second CSV dataset (optional — omit for single-source workflow)"
    ),
) -> UploadResponse:
    data = await upload_service.store_datasets(file_a, file_b)
    return UploadResponse(**data)


@router.post("/clean")
def clean_and_combine(body: CleanRequest) -> Dict[str, Any]:
    return cleaning_service.run_cleaning(
        body.dataset_a.model_dump(),
        body.dataset_b.model_dump() if body.dataset_b else None,
    )


@router.post("/train-ml", response_model=TrainResponse)
def train_ml() -> TrainResponse:
    metrics = training_service.train_ml()
    return TrainResponse(status="ok", metrics=metrics)


@router.post("/train-dl", response_model=TrainResponse)
def train_dl() -> TrainResponse:
    metrics = training_service.train_dl()
    return TrainResponse(status="ok", metrics=metrics)


@router.get("/metrics")
def metrics() -> Dict[str, Any]:
    return metrics_service.get_dashboard_payload()


@router.post("/predict-ml", response_model=PredictResponse)
def predict_ml(req: PredictRequest) -> PredictResponse:
    r = inference_service.run_ml_prediction(req.text)
    return PredictResponse(
        prediction=r.prediction,
        model=r.model,
        inference_time_ms=r.inference_time_ms,
    )


@router.post("/predict-dl", response_model=PredictResponse)
def predict_dl(req: PredictRequest) -> PredictResponse:
    r = inference_service.run_dl_prediction(req.text)
    return PredictResponse(
        prediction=r.prediction,
        model=r.model,
        inference_time_ms=r.inference_time_ms,
    )


@router.get("/logs")
def logs(limit: int = 100, offset: int = 0) -> Dict[str, Any]:
    pb = ws.paths_bundle()
    rows = fetch_logs(pb["sqlite_db"], limit=limit, offset=offset)
    return {"items": rows, "count": len(rows)}


@router.get("/manifest")
def manifest() -> Dict[str, Any]:
    return ws.read_manifest()
