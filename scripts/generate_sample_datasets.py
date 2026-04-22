"""Generate synthetic CSVs for quick demos (optional)."""

from __future__ import annotations

import random
import string
import sys
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from sentiment_app.utils.helpers import resolve_path  # noqa: E402


def random_words(k: int = 4) -> str:
    rng = random.Random(42)
    return " ".join(
        "".join(rng.choice(string.ascii_lowercase) for _ in range(6)) for _ in range(k)
    )


def expand(templates: list[str], label: str, n: int, prefix: str) -> list[dict]:
    rng = random.Random(43)
    rows = []
    for i in range(n):
        base = templates[i % len(templates)]
        noise = f" {prefix} {random_words(4)}"
        rows.append({"text": base + noise, "label": label})
    return rows


def main() -> None:
    rng = random.Random(42)
    tweet_pos = ["Love this! #happy @x https://t.co/a", "Amazing day 😀"]
    tweet_neg = ["Terrible @brand https://bad", "Worst ever 😡"]
    tweet_neu = ["Meeting at 3 #work", "News https://n.com"]
    rev_pos = ["Excellent quality", "Five stars"]
    rev_neg = ["Broke quickly", "Refund nightmare"]
    rev_neu = ["It works", "Average product"]

    n_each = 120
    tweets = []
    reviews = []
    for tpls, lab in (
        (tweet_pos, "positive"),
        (tweet_neg, "negative"),
        (tweet_neu, "neutral"),
    ):
        tweets.extend(expand(tpls, lab, n_each, "tw"))
    for tpls, lab in (
        (rev_pos, "positive"),
        (rev_neg, "negative"),
        (rev_neu, "neutral"),
    ):
        reviews.extend(expand(tpls, lab, n_each, "rv"))

    rng.shuffle(tweets)
    rng.shuffle(reviews)
    raw_dir = resolve_path("data/raw")
    raw_dir.mkdir(parents=True, exist_ok=True)
    pd.DataFrame(tweets).to_csv(raw_dir / "tweets.csv", index=False)
    pd.DataFrame(reviews).to_csv(raw_dir / "product_reviews.csv", index=False)
    print(f"Wrote sample CSVs to {raw_dir}")


if __name__ == "__main__":
    main()
