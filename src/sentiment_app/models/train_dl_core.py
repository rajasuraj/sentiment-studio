"""Fine-tune DistilBERT / BERT with custom PyTorch loop (callable from services)."""

from __future__ import annotations

import json
import random
import time
from typing import Any, Dict, List, Tuple

import numpy as np
import torch
from torch import nn
from torch.optim import AdamW
from torch.utils.data import DataLoader, Dataset
from transformers import (
    AutoModelForSequenceClassification,
    AutoTokenizer,
    get_linear_schedule_with_warmup,
)

from sentiment_app.evaluation.metrics import (
    evaluate_classifier,
    measure_model_size_mb,
    time_inference_per_sample_ms,
)
from sentiment_app.models.inference import predict_dl_batch
from sentiment_app.models.splits import load_xy_csv, train_val_test_split_text
from sentiment_app.utils.helpers import resolve_path, save_json
from sentiment_app.utils.logging_config import get_logger

logger = get_logger(__name__)


class SentimentDataset(Dataset):
    def __init__(
        self,
        texts: List[str],
        labels: List[int],
        tokenizer: Any,
        max_length: int,
    ) -> None:
        self.texts = texts
        self.labels = labels
        self.tokenizer = tokenizer
        self.max_length = max_length

    def __len__(self) -> int:
        return len(self.texts)

    def __getitem__(self, idx: int) -> Dict[str, torch.Tensor]:
        enc = self.tokenizer(
            self.texts[idx],
            truncation=True,
            padding="max_length",
            max_length=self.max_length,
            return_tensors="pt",
        )
        item = {k: v.squeeze(0) for k, v in enc.items()}
        item["labels"] = torch.tensor(self.labels[idx], dtype=torch.long)
        return item


def set_seed(seed: int) -> None:
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)


def train_epoch(
    model: nn.Module,
    loader: DataLoader,
    optimizer: torch.optim.Optimizer,
    scheduler: Any,
    loss_fn: nn.Module,
    device: torch.device,
) -> float:
    model.train()
    total_loss = 0.0
    n = 0
    for batch in loader:
        batch = {k: v.to(device) for k, v in batch.items()}
        labels = batch.pop("labels")
        outputs = model(**batch)
        loss = loss_fn(outputs.logits, labels)
        optimizer.zero_grad()
        loss.backward()
        optimizer.step()
        scheduler.step()
        total_loss += loss.item() * labels.size(0)
        n += labels.size(0)
    return total_loss / max(n, 1)


@torch.no_grad()
def evaluate_loss(
    model: nn.Module,
    loader: DataLoader,
    loss_fn: nn.Module,
    device: torch.device,
) -> float:
    model.eval()
    total_loss = 0.0
    n = 0
    for batch in loader:
        batch = {k: v.to(device) for k, v in batch.items()}
        labels = batch.pop("labels")
        outputs = model(**batch)
        loss = loss_fn(outputs.logits, labels)
        total_loss += loss.item() * labels.size(0)
        n += labels.size(0)
    return total_loss / max(n, 1)


@torch.no_grad()
def predict_labels(
    model: nn.Module,
    loader: DataLoader,
    device: torch.device,
    id2label: Dict[int, str],
) -> Tuple[List[str], List[str]]:
    model.eval()
    y_true: List[str] = []
    y_pred: List[str] = []
    for batch in loader:
        labels = batch.pop("labels").tolist()
        batch = {k: v.to(device) for k, v in batch.items()}
        outputs = model(**batch)
        preds = outputs.logits.argmax(dim=-1).tolist()
        y_true.extend([id2label[i] for i in labels])
        y_pred.extend([id2label[i] for i in preds])
    return y_true, y_pred


def train_dl_model(cfg: Dict[str, Any]) -> Dict[str, Any]:
    paths = cfg["paths"]
    data_path = resolve_path(paths["cleaned_dataset"])
    if not data_path.exists():
        raise FileNotFoundError(str(data_path))

    texts, labels_str = load_xy_csv(str(data_path))
    labels_sorted = sorted(set(labels_str))
    label2id = {lab: i for i, lab in enumerate(labels_sorted)}
    id2label = {i: lab for lab, i in label2id.items()}
    label_map_path = resolve_path(paths["label_map"])
    label_map_path.parent.mkdir(parents=True, exist_ok=True)
    with open(label_map_path, "w", encoding="utf-8") as f:
        json.dump(
            {"label2id": label2id, "id2label": {str(k): v for k, v in id2label.items()}},
            f,
            indent=2,
        )

    tr_cfg = cfg["training"]
    set_seed(int(tr_cfg.get("seed", 42)))

    X_tr, X_va, X_te, y_tr_s, y_va_s, y_te_s = train_val_test_split_text(
        texts,
        labels_str,
        test_size=0.2,
        val_fraction_of_train_portion=float(tr_cfg.get("val_ratio", 0.15)),
        random_state=int(tr_cfg.get("seed", 42)),
    )
    y_train = [label2id[str(y)] for y in y_tr_s.tolist()]
    y_val = [label2id[str(y)] for y in y_va_s.tolist()]
    y_test = [label2id[str(y)] for y in y_te_s.tolist()]
    x_train = X_tr.tolist()
    x_val = X_va.tolist()
    x_test = X_te.tolist()

    model_name = cfg["model"]["name"]
    max_length = int(cfg["model"]["max_length"])
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    model = AutoModelForSequenceClassification.from_pretrained(
        model_name,
        num_labels=len(labels_sorted),
        id2label=id2label,
        label2id=label2id,
    )

    train_ds = SentimentDataset(x_train, y_train, tokenizer, max_length)
    val_ds = SentimentDataset(x_val, y_val, tokenizer, max_length)
    test_ds = SentimentDataset(x_test, y_test, tokenizer, max_length)

    bs = int(tr_cfg["batch_size"])
    train_loader = DataLoader(
        train_ds, batch_size=bs, shuffle=True, num_workers=0, pin_memory=False
    )
    val_loader = DataLoader(val_ds, batch_size=bs, num_workers=0, pin_memory=False)
    test_loader = DataLoader(test_ds, batch_size=bs, num_workers=0, pin_memory=False)

    device_str = cfg.get("device", "auto")
    if device_str == "auto":
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    else:
        device = torch.device(device_str)
    model.to(device)

    optimizer = AdamW(
        model.parameters(),
        lr=float(tr_cfg["learning_rate"]),
        weight_decay=float(tr_cfg.get("weight_decay", 0.01)),
    )
    loss_fn = nn.CrossEntropyLoss()

    epochs = int(tr_cfg["max_epochs"])
    num_train_steps = max(1, epochs * len(train_loader))
    warmup_ratio = float(tr_cfg.get("warmup_ratio", 0.1))
    warmup_steps = int(num_train_steps * warmup_ratio)
    scheduler = get_linear_schedule_with_warmup(
        optimizer,
        num_warmup_steps=warmup_steps,
        num_training_steps=num_train_steps,
    )

    patience = int(tr_cfg.get("early_stopping_patience", 2))
    best_val = float("inf")
    best_state: Dict[str, torch.Tensor] | None = None
    stale = 0

    t_train0 = time.perf_counter()
    for epoch in range(epochs):
        tr_loss = train_epoch(
            model, train_loader, optimizer, scheduler, loss_fn, device
        )
        va_loss = evaluate_loss(model, val_loader, loss_fn, device)
        logger.info(
            "Epoch %s | train_loss=%.4f val_loss=%.4f", epoch + 1, tr_loss, va_loss
        )
        if va_loss < best_val - 1e-6:
            best_val = va_loss
            best_state = {k: v.cpu().clone() for k, v in model.state_dict().items()}
            stale = 0
        else:
            stale += 1
            if stale >= patience:
                logger.info("Early stopping at epoch %s", epoch + 1)
                break

    train_time = time.perf_counter() - t_train0
    if best_state is not None:
        model.load_state_dict(best_state)

    out_dir = resolve_path(paths["model_dir"])
    out_dir.mkdir(parents=True, exist_ok=True)
    model.save_pretrained(out_dir)
    tokenizer.save_pretrained(out_dir)

    y_true_te, y_pred_te = predict_labels(model, test_loader, device, id2label)
    metrics = evaluate_classifier(y_true_te, y_pred_te)
    metrics["training_time_seconds"] = train_time

    def dl_predict(texts: List[str]) -> np.ndarray:
        return np.array(
            predict_dl_batch(
                model, tokenizer, id2label, device, texts, max_length=max_length
            )
        )

    bench_n = int(tr_cfg.get("inference_benchmark_samples", 40))
    infer_subset = x_test[: min(len(x_test), bench_n)]
    metrics["inference_ms_per_sample"] = time_inference_per_sample_ms(
        dl_predict, infer_subset
    )
    metrics["model_size_mb"] = float(measure_model_size_mb(out_dir))

    metrics_path = resolve_path(
        paths.get("metrics_output", "data/workspace/dl_metrics.json")
    )
    save_json(metrics, metrics_path)
    metrics["_saved_metrics_path"] = str(metrics_path)
    return metrics
