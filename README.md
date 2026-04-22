# Sentiment Studio · OOP Technologies

**Sentiment Studio** is a sentiment analytics product by [**OOP Technologies**](https://github.com/rajasuraj). This repository contains the full-stack application:

Full-stack application: **FastAPI** backend (modular `src/sentiment_app`) and **React + TypeScript + Tailwind** frontend (`frontend/`). Users upload **one or two** CSV datasets, map text/label columns, run cleaning, train **TF-IDF + linear model with GridSearchCV** and a **Hugging Face transformer** (custom PyTorch loop with scheduler + early stopping), compare models on a dashboard, run predictions, and audit **SQLite** logs.

**Rubric & dataset write-up:** see [`docs/REQUIREMENTS_COMPLIANCE.md`](docs/REQUIREMENTS_COMPLIANCE.md) and [`docs/DATASET.md`](docs/DATASET.md).

## Backend layout (`src/sentiment_app`)

| Module | Purpose |
|--------|---------|
| `api/` | FastAPI app, routes, schemas |
| `config/` | YAML at `src/config/` (paths merged with workspace at runtime) |
| `data/` | Package marker (artifacts live under `data/workspace/`) |
| `preprocessing/` | Text cleaning & dataframe pipeline |
| `models/` | ML/DL training cores + inference + splits |
| `evaluation/` | Metrics + dashboard aggregation |
| `database/` | SQLite init + read/write helpers |
| `services/` | Workspace, cleaning, training, metrics, prediction orchestration |
| `utils/` | Paths, YAML/JSON IO, logging |

### API (`PYTHONPATH=src`)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/healthcheck` | Liveness |
| `POST` | `/api/upload` | Multipart `file_a` (required), `file_b` (optional CSV) |
| `POST` | `/api/clean` | JSON: `dataset_a` required, `dataset_b` optional if only one file was uploaded |
| `POST` | `/api/train-ml` | GridSearchCV training, saves `model_ml.pkl` + metrics |
| `POST` | `/api/train-dl` | HF + PyTorch fine-tune, saves transformer + metrics |
| `GET` | `/api/metrics` | Dashboard payload (distributions, histogram, both models, recommendation) |
| `POST` | `/api/predict-ml` | `{"text":"..."}` → prediction + SQLite log |
| `POST` | `/api/predict-dl` | same for DL |
| `GET` | `/api/logs?limit=100` | Recent predictions |
| `GET` | `/api/manifest` | Workspace flags (`cleaned`, `ml_trained`, …) |

Artifacts default to **`data/workspace/`** (see `src/config/app.yaml`).

## Frontend (`frontend/`)

```bash
cd frontend
npm install
npm run dev
```

Vite dev server proxies `/api` and `/healthcheck` to `http://127.0.0.1:8000`. Override with `VITE_API_BASE` if the API runs elsewhere.

For **very large CSV uploads** (100MB+), create `frontend/.env.development` with e.g. `VITE_API_BASE=http://127.0.0.1:8001` (match your uvicorn port) so the browser talks to the API **directly** instead of through the Vite proxy. `src/config/app.yaml` lists CORS origins including ports **5173** and **5174**.

Pages: **Upload → Cleaning → Train → Dashboard → Predict → Logs**.

### Vercel (frontend only)

After the repo is on GitHub: import the project in [Vercel](https://vercel.com), set **Root Directory** to `frontend`, install/build defaults (`npm run build`, output `dist`), and set **`VITE_API_BASE`** to your live API origin. Add that Vercel URL to FastAPI CORS in `src/config/app.yaml` (or your deployment config) so the browser can call the backend.

## Run backend

```powershell
cd D:\Assesment
$env:PYTHONPATH = "D:\Assesment\src"
python -m uvicorn sentiment_app.api.main:app --reload --port 8000
```

## Datasets in `data/raw`

Current layout (replace files as needed):

| File | Role | Notes |
|------|------|--------|
| `Tweets.csv` | Sentiment140-style dump | **No header row.** Quoted CSV with six fields: polarity (`0` negative, `2` neutral, `4` positive), id, date, query, user, tweet text. The file is large (~1.6M rows) and sorted by polarity; **do not** upload it directly or `pandas` will treat the first tweet as column names. |
| `YoutubeCommentsDataSet.csv` | Second source | Header row with **`Comment`** (text) and **`Sentiment`** (`positive` / `neutral` / `negative`). |

### Prepare upload-ready CSVs (recommended)

This balances tweet polarities in a streaming pass and normalizes YouTube labels, then writes two small CSVs with headers `text` and `label` (same names on both sides, so the UI maps both to `text` / `label`).

```powershell
cd D:\Assesment
$env:PYTHONPATH = "D:\Assesment\src"
python scripts\prepare_raw_datasets.py --copy-to-workspace
```

Useful flags: `--twitter-per-class 8000` (default), `--youtube-max 8000` to cap rows, `--out-a` / `--out-b` output names under `data/raw`. Without `--copy-to-workspace`, upload `data/raw\twitter_for_upload.csv` and `data/raw\youtube_for_upload.csv` manually as dataset A and B.

Then in the app: **Cleaning** → map **text** / **label** for both datasets → **Train ML** (fast) → **Train DL** (CPU-heavy; tune `src/config/dl_config.yaml` `max_epochs` / `batch_size` or use a GPU).

### Optional synthetic CSVs

```powershell
python scripts\generate_sample_datasets.py
```

Writes `data/raw/tweets.csv` and `data/raw/product_reviews.csv` with columns `text`, `label` for quick demos.

## Tests

```powershell
$env:PYTHONPATH = "D:\Assesment\src"
pytest
```

## Configuration

- `src/config/app.yaml` — workspace root, CORS, upload size cap  
- `src/config/ml_config.yaml` — classifier (`logistic_regression` or `linear_svc`), TF-IDF, grid  
- `src/config/dl_config.yaml` — model name, epochs, early stopping, batch size  

Training merges these with dynamic paths under the workspace.

## Production notes

- DL training is CPU-heavy; use GPU + tune `max_epochs` / `batch_size` in `dl_config.yaml`.  
- For static hosting, `npm run build` and serve `frontend/dist` behind nginx; keep API on HTTPS with tightened CORS in `app.yaml`.
