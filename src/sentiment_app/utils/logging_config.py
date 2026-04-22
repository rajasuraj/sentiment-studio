"""Logging setup with optional structured (JSON) suffix fields."""

from __future__ import annotations

import json
import logging
import sys
from typing import Any, Dict, Optional


class StructuredFormatter(logging.Formatter):
    """Standard line log + JSON object when extra_fields is present on the record."""

    def format(self, record: logging.LogRecord) -> str:
        base = super().format(record)
        extra: Optional[Dict[str, Any]] = getattr(record, "extra_fields", None)
        if extra:
            try:
                return base + " | " + json.dumps(extra, default=str, sort_keys=True)
            except (TypeError, ValueError):
                return base + " | " + repr(extra)
        return base


def get_logger(name: str) -> logging.Logger:
    """Module logger; output handled by root after configure_app_logging()."""
    return logging.getLogger(name)


def configure_app_logging(level_name: str = "INFO", structured: bool = True) -> None:
    """Configure root + stream handler once (idempotent)."""
    level = getattr(logging, level_name.upper(), logging.INFO)
    formatter: logging.Formatter
    if structured:
        formatter = StructuredFormatter(
            "%(asctime)s | %(levelname)s | %(name)s | %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )
    else:
        formatter = logging.Formatter(
            "%(asctime)s | %(levelname)s | %(name)s | %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )

    root = logging.getLogger()
    if not root.handlers:
        h = logging.StreamHandler(sys.stdout)
        h.setFormatter(formatter)
        h.setLevel(level)
        root.addHandler(h)
    root.setLevel(level)

    for name in ("uvicorn", "uvicorn.error", "uvicorn.access", "fastapi"):
        lg = logging.getLogger(name)
        lg.handlers.clear()
        lg.setLevel(level)
        lg.propagate = True


def log_event(logger: logging.Logger, event: str, **fields: Any) -> None:
    """Emit log with stable event id and optional structured fields."""
    logger.info(event, extra={"extra_fields": {"event": event, **fields}})


def configure_root(level: int = logging.INFO) -> None:
    """CLI / script helper."""
    configure_app_logging(logging.getLevelName(level), structured=False)
