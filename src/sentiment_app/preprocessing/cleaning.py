"""Text cleaning for social and review text."""

from __future__ import annotations

import re
from typing import Optional

import pandas as pd

from sentiment_app.utils.logging_config import get_logger

logger = get_logger(__name__)

_EMOJI_PATTERN = re.compile(
    "["
    "\U0001F600-\U0001F64F"
    "\U0001F300-\U0001F5FF"
    "\U0001F680-\U0001F6FF"
    "\U0001F1E0-\U0001F1FF"
    "\U00002702-\U000027B0"
    "\U000024C2-\U0001F251"
    "\U0001F900-\U0001F9FF"
    "\U0001FA00-\U0001FA6F"
    "\U0001FA70-\U0001FAFF"
    "]+",
    flags=re.UNICODE,
)

_URL_PATTERN = re.compile(r"https?://\S+|www\.\S+", re.IGNORECASE)
_MENTION_PATTERN = re.compile(r"@\w+")
_HASHTAG_PATTERN = re.compile(r"#(\w+)")
_NON_ALNUM_SPACE = re.compile(r"[^a-z\s]+")
_MULTISPACE = re.compile(r"\s+")


def clean_text(text: str) -> str:
    """Lowercase, strip URLs/mentions/hashtags/emojis, letters only, collapse spaces."""
    if not isinstance(text, str):
        return ""
    s = text.lower().strip()
    s = _URL_PATTERN.sub(" ", s)
    s = _MENTION_PATTERN.sub(" ", s)
    s = _HASHTAG_PATTERN.sub(r"\1", s)
    s = _EMOJI_PATTERN.sub(" ", s)
    s = _NON_ALNUM_SPACE.sub(" ", s)
    s = _MULTISPACE.sub(" ", s).strip()
    return s


def _fill_missing(series: pd.Series) -> pd.Series:
    return series.fillna("").astype(str)


def preprocess_dataframe(
    df: pd.DataFrame,
    text_column: str,
    label_column: str,
    drop_duplicates: bool = True,
    extra_columns: Optional[tuple[str, ...]] = None,
) -> pd.DataFrame:
    """Apply cleaning, drop empty rows and optional duplicates."""
    extra_columns = extra_columns or ()
    needed = [text_column, label_column, *extra_columns]
    missing = [c for c in needed if c not in df.columns]
    if missing:
        raise ValueError(f"Missing columns: {missing}")

    out = df.copy()
    out[text_column] = _fill_missing(out[text_column])
    out[label_column] = _fill_missing(out[label_column])
    for c in extra_columns:
        out[c] = _fill_missing(out[c])
    out[text_column] = out[text_column].map(clean_text)
    before = len(out)
    out = out[out[text_column].str.len() > 0]
    logger.info("Dropped %s rows with empty text after cleaning", before - len(out))
    keep_cols = [text_column, label_column, *extra_columns]
    out = out[keep_cols]
    if drop_duplicates:
        dup_before = len(out)
        out = out.drop_duplicates(subset=[text_column], keep="first")
        logger.info("Removed %s duplicate texts", dup_before - len(out))
    return out.reset_index(drop=True)
