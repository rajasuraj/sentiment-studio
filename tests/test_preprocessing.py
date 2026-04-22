"""Preprocessing tests."""

from __future__ import annotations

import pandas as pd

from sentiment_app.preprocessing.cleaning import clean_text, preprocess_dataframe


def test_clean_text_strips_url_and_emoji() -> None:
    raw = "Hi https://a.com @u #tag day 9 😀"
    out = clean_text(raw)
    assert "http" not in out
    assert "😀" not in out


def test_preprocess_dedupe() -> None:
    df = pd.DataFrame(
        {
            "text": ["Hello https://a.com", "Hello @b", "Unique phrase"],
            "label": ["a", "b", "c"],
        }
    )
    out = preprocess_dataframe(df, "text", "label", drop_duplicates=True)
    assert len(out) == 2
