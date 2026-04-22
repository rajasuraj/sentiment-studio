"""Pydantic request/response models."""

from __future__ import annotations

from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field


class ColumnMapping(BaseModel):
    text_column: str = Field(..., min_length=1)
    label_column: str = Field(..., min_length=1)


class CleanRequest(BaseModel):
    dataset_a: ColumnMapping
    dataset_b: Optional[ColumnMapping] = None


class PredictRequest(BaseModel):
    text: str = Field(..., min_length=1)


class PredictResponse(BaseModel):
    prediction: str
    model: str
    inference_time_ms: float


class TrainResponse(BaseModel):
    status: str
    metrics: Optional[Dict[str, Any]] = None
    detail: Optional[str] = None


class UploadResponse(BaseModel):
    status: str
    upload_mode: Literal["single", "dual"]
    columns_a: List[str]
    columns_b: List[str]
    rows_a: int
    rows_b: int
