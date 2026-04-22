# Dataset selection, curation, and challenges

## Sources

| Source | Role | Why use it |
|--------|------|------------|
| **Sentiment140-style tweets** (`Tweets.csv` / `training.1600000.processed.noemoticon.csv`) | Short social text, noisy (URLs, mentions, emojis) | Classic sentiment benchmark; stresses cleaning and TF-IDF + subword models differently. |
| **YouTube comments** (`YoutubeCommentsDataSet.csv`) | Longer informal text, three-way labels | Adds domain shift vs. Twitter; label set (`positive` / `neutral` / `negative`) matches the 3-class DL head. |

## Subset and curation (300–500 rows per spec)

The rubric asks for a **manually chosen subset of 300–500 rows per dataset**. In this repo:

- Use `python scripts/prepare_raw_datasets.py` with **`--twitter-per-class`** and **`--youtube-max`** capped (e.g. `--twitter-per-class 250 --youtube-max 500`) to land near that range while keeping classes balanced for tweets.
- Alternatively, export a hand-picked slice from a notebook or spreadsheet and upload the resulting CSV(s) through the UI (single- or dual-file flow).

The **cleaning** step then deduplicates, strips URLs/mentions/hashtags/emojis (see `src/sentiment_app/preprocessing/cleaning.py`), and merges sources when two files are uploaded.

## Challenges encountered

1. **Sentiment140 format**: no header row; quoted CSV; polarity encoded as `0` / `2` / `4`. Naive `read_csv` treats the first tweet as column names — use the preparation script or `header=None` + column names.
2. **Scale**: full tweet dump is ~1.6M rows and hundreds of MB — impractical for interactive GridSearch + transformer fine-tune on a laptop; chunked sampling or prepared uploads are required.
3. **Encoding**: mixed UTF-8 / mojibake in some YouTube rows — the prep script tries multiple encodings and normalizes labels to lowercase strings.

## Final statistics (after clean)

After **`/api/clean`**, open **`GET /api/metrics`** or inspect `data/workspace/dataset_stats.json` for:

- Class distribution  
- Average / min / max text length (characters)  
- Row counts after deduplication  

The dashboard surfaces the same aggregates for charts and the deployment recommendation.
