"""Dashboard metrics aggregation."""

from __future__ import annotations

from typing import Any, Dict

from sentiment_app.evaluation.dashboard import build_dashboard_payload
from sentiment_app.services import workspace as ws


def get_dashboard_payload() -> Dict[str, Any]:
    pb = ws.paths_bundle()
    return build_dashboard_payload(
        workspace_root=pb["workspace"],
        dataset_stats_path=pb["dataset_stats"],
        cleaned_csv_path=pb["cleaned_csv"],
        ml_metrics_path=pb["ml_metrics"],
        dl_metrics_path=pb["dl_metrics"],
    )
