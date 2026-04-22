"""SQLite persistence for prediction logs."""

from __future__ import annotations

import sqlite3
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

from sentiment_app.utils.helpers import resolve_path
from sentiment_app.utils.logging_config import get_logger

logger = get_logger(__name__)


def init_db(db_path: str | Path) -> None:
    path = resolve_path(db_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(path))
    try:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS predictions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                input_text TEXT NOT NULL,
                prediction TEXT NOT NULL,
                model_used TEXT NOT NULL,
                inference_time_ms REAL NOT NULL,
                created_at REAL NOT NULL
            )
            """
        )
        conn.commit()
    finally:
        conn.close()
    logger.info("SQLite ready at %s", path)


def log_prediction(
    db_path: str | Path,
    input_text: str,
    prediction: str,
    model_used: str,
    inference_time_ms: float,
    timestamp: Optional[float] = None,
) -> None:
    ts = timestamp if timestamp is not None else time.time()
    path = resolve_path(db_path)
    conn = sqlite3.connect(str(path))
    try:
        conn.execute(
            """
            INSERT INTO predictions
            (input_text, prediction, model_used, inference_time_ms, created_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (input_text, prediction, model_used, inference_time_ms, ts),
        )
        conn.commit()
    finally:
        conn.close()


def fetch_logs(
    db_path: str | Path, limit: int = 200, offset: int = 0
) -> List[Dict[str, Any]]:
    path = resolve_path(db_path)
    if not path.exists():
        return []
    conn = sqlite3.connect(str(path))
    try:
        cur = conn.execute(
            """
            SELECT id, input_text, prediction, model_used, inference_time_ms, created_at
            FROM predictions
            ORDER BY id DESC
            LIMIT ? OFFSET ?
            """,
            (limit, offset),
        )
        rows = cur.fetchall()
    finally:
        conn.close()
    return [
        {
            "id": r[0],
            "input_text": r[1],
            "prediction": r[2],
            "model_used": r[3],
            "inference_time_ms": r[4],
            "created_at": r[5],
        }
        for r in rows
    ]
