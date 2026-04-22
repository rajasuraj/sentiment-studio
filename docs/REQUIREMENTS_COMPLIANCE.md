# Assessment requirements — compliance matrix

This document maps the stated rubric to the current repository. **Full** = implemented as specified; **Partial** = implemented with gaps or under a different path/name; **Gap** = missing or needs author input.

| # | Requirement | Status | Where / notes |
|---|-------------|--------|-----------------|
| **1** | Two open-source datasets | **Full** | Twitter/Sentiment140 + YouTube comments (`data/raw/`, `docs/DATASET.md`). |
| **1** | Manually chosen subset 300–500 rows each | **Partial** | `scripts/prepare_raw_datasets.py` defaults to larger balanced samples; **adjust CLI flags** to hit 300–500 per source. Narrative in `docs/DATASET.md`. |
| **1** | Combine + clean (dupes, emoji, links, specials) | **Full** | `preprocessing/cleaning.py`, `services/cleaning_service.py`. |
| **1** | Document rationale, challenges, stats | **Partial** | `docs/DATASET.md` + metrics after clean; expand with your own “manual selection” story if assessors expect it. |
| **2a** | Classical ML: TF-IDF + LR or Linear SVM | **Full** | `src/config/ml_config.yaml`, `models/train_ml_core.py` (GridSearchCV). |
| **2a** | GridSearchCV | **Full** | `ml_config.yaml` → `train_ml_core.py`. |
| **2b** | Transformer fine-tune (HF / PyTorch) | **Full** | `src/config/dl_config.yaml`, `models/train_dl_core.py` (DistilBERT default). |
| **2b** | Custom training loop, LR schedule, early stopping | **Full** | `train_dl_core.py` (AdamW, linear warmup schedule, val-based early stopping). |
| **3** | Dashboard: precision/recall/F1 per class, confusion matrices, infer speed, size, train time | **Partial** | Backend aggregates in `evaluation/` + `GET /api/metrics`; frontend **Dashboard** shows charts/tables/recommendation. **Per-class** PR/F1 depth depends on what metrics JSON stores — verify against your latest `ml_metrics.json` / `dl_metrics.json` and extend `evaluation/` if assessors require exhaustive per-class tables. |
| **3** | Written conclusions + deploy choice | **Partial** | Heuristic recommendation in API payload + UI; add a short **static “Conclusions”** section in `Dashboard.tsx` or this doc if you need fixed English prose for grading. |
| **4** | Folder layout `/src` data, preprocessing, models, evaluation, api, config + `/tests` | **Partial** | Logic lives under `src/sentiment_app/` with `api`, `preprocessing`, `models`, `evaluation`, `config` at `src/config/`. **`src/sentiment_app/data`** is a package marker (artifacts under `data/workspace/`). |
| **4** | notebooks/ | **Full** | `notebooks/README.md` (optional; pipeline is API/script-driven). |
| **4** | Modular preprocessing / training / inference / eval / API / utils | **Full** | See `README.md` module table + `services/`, `utils/logging_config.py`. |
| **5** | `POST /predict-ml`, `POST /predict-dl`, `GET /healthcheck` | **Partial** | Implemented as **`/api/predict-ml`**, **`/api/predict-dl`**, **`/healthcheck`** (router prefix `/api` for predict). |
| **5** | SQLite logs: text, prediction, model, inference time | **Full** | `database/sqlite.py`, inference services, `GET /api/logs`. |
| **6** | requirements / env / Docker | **Full** | `requirements.txt`, `Dockerfile`, YAML configs per model type. |
| **6** | JSON/YAML hyperparameters + paths | **Full** | `src/config/app.yaml`, `ml_config.yaml`, `dl_config.yaml` merged with workspace paths at runtime (`settings.py`). |
| **7** | Detailed documentation | **Partial** | `README.md` + this folder; extend with **exact API JSON examples** and a **frozen results screenshot/table** if the rubric is strict. |

## Upload behaviour (product)

- **One CSV**: `POST /api/upload` with `file_a` only → `upload_mode: "single"` → `POST /api/clean` with **`dataset_a` only**.  
- **Two CSVs**: include `file_a` and `file_b` → `upload_mode: "dual"` → `POST /api/clean` with both mappings.
