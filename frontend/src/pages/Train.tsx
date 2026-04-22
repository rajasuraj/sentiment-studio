import type { ReactNode } from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowRight, Brain, CheckCircle2, Cpu, Timer } from "lucide-react";
import { trainDl, trainMl } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/cn";

type TrainMetrics = {
  macro_f1?: number;
  accuracy?: number;
  training_time_seconds?: number;
};

export function TrainPage() {
  const navigate = useNavigate();
  const [log, setLog] = useState<string[]>([]);
  const [busy, setBusy] = useState<"ml" | "dl" | null>(null);
  const [mlStatus, setMlStatus] = useState<"idle" | "training" | "done">("idle");
  const [dlStatus, setDlStatus] = useState<"idle" | "training" | "done">("idle");
  const [mlMetrics, setMlMetrics] = useState<TrainMetrics | null>(null);
  const [dlMetrics, setDlMetrics] = useState<TrainMetrics | null>(null);

  function push(line: string) {
    setLog((l) => [...l, line]);
  }

  async function runMl() {
    setBusy("ml");
    setMlStatus("training");
    setMlMetrics(null);
    const t = toast.loading("Training classical ML with GridSearchCV…");
    push("Starting ML (GridSearchCV)…");
    try {
      const r = (await trainMl()) as { status: string; metrics?: TrainMetrics };
      const m = r.metrics ?? {};
      setMlMetrics(m);
      const f1 = m.macro_f1 ?? 0;
      const acc = m.accuracy ?? 0;
      push(`ML complete · macro F1 = ${f1.toFixed(4)} · accuracy = ${acc.toFixed(4)}`);
      toast.success(`ML training finished · macro F1 ${f1.toFixed(3)}`, { id: t });
      setMlStatus("done");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "ML failed";
      push(msg);
      toast.error(msg, { id: t });
      setMlStatus("idle");
    } finally {
      setBusy(null);
    }
  }

  async function runDl() {
    setBusy("dl");
    setDlStatus("training");
    setDlMetrics(null);
    const t = toast.loading("Fine-tuning transformer (this may take a while)…");
    push("Starting DL (Hugging Face + PyTorch)…");
    try {
      const r = (await trainDl()) as { status: string; metrics?: TrainMetrics };
      const m = r.metrics ?? {};
      setDlMetrics(m);
      const f1 = m.macro_f1 ?? 0;
      const acc = m.accuracy ?? 0;
      push(`DL complete · macro F1 = ${f1.toFixed(4)} · accuracy = ${acc.toFixed(4)}`);
      toast.success(`DL training finished · macro F1 ${f1.toFixed(3)}`, { id: t });
      setDlStatus("done");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "DL failed";
      push(msg);
      toast.error(msg, { id: t });
      setDlStatus("idle");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-10">
      <PageHeader
        title="Train models"
        description="Sparse linear pipeline with hyperparameter search, then a DistilBERT-style encoder with AdamW, warmup scheduler, and early stopping on validation loss."
        actions={
          <Button
            variant="secondary"
            size="md"
            className="gap-2 shadow-sm transition-transform duration-150 hover:-translate-y-0.5"
            onClick={() => navigate("/dashboard")}
          >
            Open dashboard
            <ArrowRight className="h-4 w-4" />
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <TrainModelCard
          title="Classical ML"
          subtitle="TF-IDF + logistic regression / linear SVM with stratified CV."
          badge="sklearn"
          badgeVariant="neutral"
          trainLabel="ML"
          icon={<Cpu className="h-5 w-5" strokeWidth={1.5} />}
          iconClass="bg-ink-900 text-white shadow-md"
          status={mlStatus}
          busy={busy === "ml"}
          disabled={busy !== null}
          onTrain={runMl}
          metrics={mlMetrics}
          variant="dark"
        />
        <TrainModelCard
          title="Deep learning"
          subtitle="Transformer fine-tuning with custom loop and checkpointing."
          badge="PyTorch"
          badgeVariant="accent"
          trainLabel="DL"
          icon={<Brain className="h-5 w-5" strokeWidth={1.5} />}
          iconClass="bg-accent text-white shadow-md ring-1 ring-indigo-500/20"
          status={dlStatus}
          busy={busy === "dl"}
          disabled={busy !== null}
          onTrain={runDl}
          metrics={dlMetrics}
          variant="primary"
        />
      </div>

      <Card padding="p-0" className="overflow-hidden shadow-md ring-1 ring-slate-200/50">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/90 px-6 py-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500">Run log</h2>
          <span className="text-[10px] font-medium text-slate-400">Latest at bottom</span>
        </div>
        <div className="max-h-80 overflow-y-auto px-6 py-4 font-mono text-[12px] leading-relaxed text-slate-600">
          {busy ? (
            <div className="space-y-2">
              <Skeleton className="h-3 w-full rounded-md" />
              <Skeleton className="h-3 w-[88%] rounded-md" />
              <Skeleton className="h-3 w-[80%] rounded-md" />
            </div>
          ) : log.length === 0 ? (
            <p className="text-slate-400">Output from training jobs will appear here.</p>
          ) : (
            log.map((line, i) => (
              <div key={i} className="border-b border-slate-50 py-1.5 last:border-0">
                {line}
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}

function TrainModelCard({
  title,
  subtitle,
  badge,
  badgeVariant,
  trainLabel,
  icon,
  iconClass,
  status,
  busy,
  disabled,
  onTrain,
  metrics,
  variant,
}: {
  title: string;
  subtitle: string;
  badge: string;
  badgeVariant: "neutral" | "accent";
  trainLabel: string;
  icon: ReactNode;
  iconClass: string;
  status: "idle" | "training" | "done";
  busy: boolean;
  disabled: boolean;
  onTrain: () => void;
  metrics: TrainMetrics | null;
  variant: "dark" | "primary";
}) {
  return (
    <Card
      hover
      className="relative overflow-hidden p-6 shadow-md ring-1 ring-slate-200/40 transition-shadow duration-200"
    >
      <div className="pointer-events-none absolute -right-8 -top-8 h-36 w-36 rounded-full bg-gradient-to-br from-slate-100/90 to-transparent" />
      <CardHeader
        title={title}
        description={subtitle}
        action={<Badge variant={badgeVariant}>{badge}</Badge>}
      />
      <div className="relative mt-4 flex flex-wrap items-center gap-4">
        <div className={cn("flex h-12 w-12 items-center justify-center rounded-2xl", iconClass)}>{icon}</div>
        <Button
          variant={variant}
          size="md"
          loading={busy}
          disabled={disabled}
          onClick={onTrain}
          className="shadow-sm"
        >
          Train {trainLabel}
        </Button>
        <StatusChip status={status} />
      </div>
      <div
        className={cn(
          "mt-5 h-1.5 overflow-hidden rounded-full",
          busy ? "bg-slate-100" : "bg-slate-100"
        )}
      >
        {busy ? (
          <div className="h-full w-full bg-gradient-to-r from-accent/0 via-accent/50 to-accent/0 animate-pulse" />
        ) : null}
      </div>
      {metrics && (metrics.accuracy != null || metrics.macro_f1 != null) ? (
        <dl className="mt-6 grid grid-cols-3 gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 p-4 text-center">
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Accuracy</dt>
            <dd className="mt-1 font-display text-lg font-semibold text-ink-950">
              {(metrics.accuracy ?? 0).toFixed(3)}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Macro F1</dt>
            <dd className="mt-1 font-display text-lg font-semibold text-ink-950">
              {(metrics.macro_f1 ?? 0).toFixed(3)}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Train time</dt>
            <dd className="mt-1 flex items-center justify-center gap-1 font-display text-lg font-semibold text-ink-950">
              <Timer className="h-3.5 w-3.5 text-slate-400" />
              {(metrics.training_time_seconds ?? 0).toFixed(1)}s
            </dd>
          </div>
        </dl>
      ) : null}
    </Card>
  );
}

function StatusChip({ status }: { status: "idle" | "training" | "done" }) {
  if (status === "idle") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-500">
        Idle
      </span>
    );
  }
  if (status === "training") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-900">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
        Training
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-900">
      <CheckCircle2 className="h-3.5 w-3.5" />
      Completed
    </span>
  );
}
