"""Build upload-ready CSVs (text, label) from `data/raw` sources.

`Tweets.csv` is expected in Sentiment140 form: no header row, quoted fields,
columns polarity, id, date, query, user, text (polarity 0=negative, 2=neutral,
4=positive). Many public dumps are sorted by polarity; this script streams in
chunks and balances classes up to a per-class cap so training stays practical.

`YoutubeCommentsDataSet.csv` should have `Comment` and `Sentiment` columns.

Outputs two CSVs with headers `text` and `label` for the web UI (map both to
the same column names, or rely on defaults if you use these filenames as-is).

Usage::

    cd D:\\Assesment
    python scripts/prepare_raw_datasets.py
    python scripts/prepare_raw_datasets.py --copy-to-workspace
"""

from __future__ import annotations

import argparse
import shutil
import sys
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "raw"

# Import app workspace helpers when seeding the API workspace.
if str(ROOT / "src") not in sys.path:
    sys.path.insert(0, str(ROOT / "src"))


POLARITY_TO_LABEL = {0: "negative", 2: "neutral", 4: "positive"}


def _read_tweets_sample(
    tweets_path: Path,
    per_class: int,
    seed: int,
    chunksize: int = 65536,
) -> pd.DataFrame:
    names = ["polarity", "id", "date", "query", "user", "text"]
    rng = np.random.default_rng(seed)
    counts = {0: 0, 2: 0, 4: 0}
    frames: list[pd.DataFrame] = []

    reader = pd.read_csv(
        tweets_path,
        header=None,
        names=names,
        encoding="latin-1",
        on_bad_lines="skip",
        chunksize=chunksize,
    )

    neg_pos_done = False
    neutral_tail_chunks = 0
    max_neutral_tail_chunks = 24

    for chunk in reader:
        for pol in (0, 2, 4):
            if counts[pol] >= per_class:
                continue
            sub = chunk.loc[chunk["polarity"] == pol, ["text"]].copy()
            if sub.empty:
                continue
            lab = POLARITY_TO_LABEL[pol]
            need = per_class - counts[pol]
            if len(sub) <= need:
                got = sub.assign(label=lab)[["text", "label"]]
                frames.append(got)
                counts[pol] += len(got)
            else:
                idx = rng.choice(len(sub), size=need, replace=False)
                got = sub.iloc[idx].assign(label=lab)[["text", "label"]]
                frames.append(got)
                counts[pol] += need

        if counts[0] >= per_class and counts[4] >= per_class:
            neg_pos_done = True
        if neg_pos_done:
            if counts[2] >= per_class:
                break
            neutral_tail_chunks += 1
            if neutral_tail_chunks >= max_neutral_tail_chunks:
                break

    if not frames:
        raise RuntimeError("No tweet rows collected; check Tweets.csv format.")

    out = pd.concat(frames, ignore_index=True)
    out = out.sample(frac=1.0, random_state=seed).reset_index(drop=True)
    return out


def _read_youtube(path: Path, max_rows: int | None) -> pd.DataFrame:
    df = None
    for enc in ("utf-8", "utf-8-sig", "cp1252", "latin-1"):
        try:
            df = pd.read_csv(path, encoding=enc, on_bad_lines="skip")
            break
        except UnicodeDecodeError:
            continue
    if df is None:
        raise RuntimeError(f"Could not decode YouTube CSV with common encodings: {path}")
    if "Comment" not in df.columns or "Sentiment" not in df.columns:
        raise ValueError(
            f"Expected columns Comment and Sentiment; got {list(df.columns)}"
        )
    out = df.rename(columns={"Comment": "text", "Sentiment": "label"})[
        ["text", "label"]
    ]
    out["text"] = out["text"].fillna("").astype(str)
    out["label"] = out["label"].fillna("").astype(str).str.strip().str.lower()
    out = out[out["text"].str.len() > 0]
    if max_rows is not None and len(out) > max_rows:
        out = out.sample(n=max_rows, random_state=42).reset_index(drop=True)
    return out


def _copy_to_workspace(path_a: Path, path_b: Path) -> None:
    from sentiment_app.services import workspace as ws
    from sentiment_app.services import prediction_service as pred
    from sentiment_app.settings import get_settings

    paths = get_settings().paths()
    paths.upload_a.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(path_a, paths.upload_a)
    shutil.copy2(path_b, paths.upload_b)
    ws.merge_manifest(
        {
            "upload_a": True,
            "upload_b": True,
            "cleaned": False,
            "ml_trained": False,
            "dl_trained": False,
        }
    )
    pred.clear_model_cache()
    print(
        "Copied into workspace:",
        paths.upload_a,
        paths.upload_b,
        sep="\n  ",
    )


def main() -> None:
    p = argparse.ArgumentParser(description="Prepare upload-ready CSVs from raw.")
    p.add_argument("--raw-dir", type=Path, default=RAW)
    p.add_argument("--tweets", type=str, default="Tweets.csv")
    p.add_argument("--youtube", type=str, default="YoutubeCommentsDataSet.csv")
    p.add_argument(
        "--out-a",
        type=str,
        default="twitter_for_upload.csv",
        help="Output filename under raw-dir for dataset A",
    )
    p.add_argument(
        "--out-b",
        type=str,
        default="youtube_for_upload.csv",
        help="Output filename under raw-dir for dataset B",
    )
    p.add_argument(
        "--twitter-per-class",
        type=int,
        default=8000,
        help="Max rows per polarity class (0/2/4) from Sentiment140.",
    )
    p.add_argument(
        "--youtube-max",
        type=int,
        default=None,
        help="Optional cap on YouTube rows after cleaning empty text.",
    )
    p.add_argument("--seed", type=int, default=42)
    p.add_argument(
        "--copy-to-workspace",
        action="store_true",
        help="Copy outputs into workspace upload paths and reset manifest flags.",
    )
    args = p.parse_args()

    raw_dir = args.raw_dir.resolve()
    tweets_path = raw_dir / args.tweets
    youtube_path = raw_dir / args.youtube
    if not tweets_path.is_file():
        raise SystemExit(f"Missing tweets file: {tweets_path}")
    if not youtube_path.is_file():
        raise SystemExit(f"Missing youtube file: {youtube_path}")

    print("Sampling Sentiment140 tweets (chunked read)...")
    tw = _read_tweets_sample(
        tweets_path,
        per_class=args.twitter_per_class,
        seed=args.seed,
    )
    print("Tweet sample:", len(tw), "rows", tw["label"].value_counts().to_dict())

    print("Loading YouTube comments...")
    yt = _read_youtube(youtube_path, args.youtube_max)
    print("YouTube:", len(yt), "rows", yt["label"].value_counts().to_dict())

    out_a = raw_dir / args.out_a
    out_b = raw_dir / args.out_b
    raw_dir.mkdir(parents=True, exist_ok=True)
    tw.to_csv(out_a, index=False)
    yt.to_csv(out_b, index=False)
    print(f"Wrote:\n  {out_a}\n  {out_b}")

    if args.copy_to_workspace:
        _copy_to_workspace(out_a, out_b)


if __name__ == "__main__":
    main()
