"""Train/validation/test splits."""

from __future__ import annotations

from typing import Any, List, Tuple

import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split


def train_val_test_split_text(
    texts: List[str],
    labels: List[Any],
    test_size: float = 0.2,
    val_fraction_of_train_portion: float = 0.15,
    random_state: int = 42,
) -> Tuple[np.ndarray, ...]:
    X = np.array(texts)
    y = np.array(labels)

    def stratify_or_none(y_arr: np.ndarray) -> Any:
        _, c = np.unique(y_arr, return_counts=True)
        return y_arr if np.all(c >= 2) else None

    X_trv, X_te, y_trv, y_te = train_test_split(
        X,
        y,
        test_size=test_size,
        stratify=stratify_or_none(y),
        random_state=random_state,
    )
    X_tr, X_va, y_tr, y_va = train_test_split(
        X_trv,
        y_trv,
        test_size=val_fraction_of_train_portion,
        stratify=stratify_or_none(y_trv),
        random_state=random_state,
    )
    return X_tr, X_va, X_te, y_tr, y_va, y_te


def load_xy_csv(
    path: str, text_col: str = "text", label_col: str = "label"
) -> Tuple[List[str], List[str]]:
    df = pd.read_csv(path)
    return df[text_col].astype(str).tolist(), df[label_col].astype(str).tolist()
