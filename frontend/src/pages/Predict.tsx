import { useState } from "react";
import { toast } from "sonner";
import { Timer } from "lucide-react";
import { predictDl, predictMl } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";

export function PredictPage() {
  const [text, setText] = useState(
    "Shipping was fast and the product exceeded expectations."
  );
  const [result, setResult] = useState<{
    prediction: string;
    model: string;
    ms: number;
  } | null>(null);
  const [busy, setBusy] = useState<"ml" | "dl" | null>(null);

  async function run(which: "ml" | "dl") {
    setBusy(which);
    setResult(null);
    const t = toast.loading(which === "ml" ? "Running ML model…" : "Running transformer…");
    try {
      const fn = which === "ml" ? predictMl : predictDl;
      const r = (await fn(text)) as {
        prediction: string;
        model: string;
        inference_time_ms: number;
      };
      setResult({ prediction: r.prediction, model: r.model, ms: r.inference_time_ms });
      toast.success(`${r.model.toUpperCase()} · ${r.prediction}`, { id: t });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Prediction failed", { id: t });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader
        title="Predict"
        description="Score arbitrary text. Each request is written to SQLite with model name, latency, and timestamp."
      />

      <Card padding="p-8" className="shadow-md">
        <CardHeader
          title="Inference"
          description="Paste or type feedback; choose classical ML or the fine-tuned transformer."
        />
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
          Input text
        </label>
        <textarea
          className="mb-6 w-full min-h-[280px] resize-y rounded-2xl border border-slate-200 bg-white px-4 py-4 text-base leading-relaxed text-ink-900 shadow-inner outline-none transition-all placeholder:text-slate-400 focus:border-indigo-300 focus:shadow-md focus:ring-2 focus:ring-[var(--ring)]"
          value={text}
          placeholder="Paste customer feedback, a tweet, or a review…"
          onChange={(e) => setText(e.target.value)}
        />
        <div className="flex flex-wrap gap-3">
          <Button
            variant="dark"
            size="md"
            loading={busy === "ml"}
            disabled={busy !== null}
            onClick={() => void run("ml")}
            className="min-w-[9rem] shadow-sm"
          >
            Predict (ML)
          </Button>
          <Button
            variant="primary"
            size="md"
            loading={busy === "dl"}
            disabled={busy !== null}
            onClick={() => void run("dl")}
            className="min-w-[9rem] shadow-sm"
          >
            Predict (DL)
          </Button>
        </div>

        {result ? (
          <div className="mt-8 rounded-2xl border border-slate-100 bg-gradient-to-br from-slate-50/90 to-white p-6 shadow-sm ring-1 ring-slate-100/80">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Result</p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Badge variant="neutral" className="font-mono uppercase">
                {result.model}
              </Badge>
              <SentimentBadge label={result.prediction} />
            </div>
            <div className="mt-6 flex flex-wrap gap-4 border-t border-slate-100 pt-6">
              <div className="flex min-w-[200px] flex-1 gap-3 rounded-xl bg-white/80 p-3 ring-1 ring-slate-100">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                  <Timer className="h-5 w-5" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">Inference time</p>
                  <p className="text-sm font-semibold text-ink-950">{result.ms.toFixed(2)} ms</p>
                </div>
              </div>
              <div className="flex min-w-[200px] flex-1 items-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-3 text-xs text-slate-500">
                Class probabilities are not returned by the API; the model emits a single label.
              </div>
            </div>
            <p className="mt-4 text-xs text-slate-500">Logged to the prediction audit trail.</p>
          </div>
        ) : (
          <p className="mt-8 text-center text-sm text-slate-400">
            Results and timing appear here after a successful prediction.
          </p>
        )}
      </Card>
    </div>
  );
}

function sentimentVariant(pred: string): "success" | "danger" | "default" {
  const p = pred.toLowerCase();
  if (p === "pos" || p === "positive") return "success";
  if (p === "neg" || p === "negative") return "danger";
  return "default";
}

function SentimentBadge({ label }: { label: string }) {
  const v = sentimentVariant(label);
  return (
    <Badge
      variant={v}
      className={cn(
        "px-3 py-1 text-sm font-semibold capitalize",
        v === "default" && "text-slate-700"
      )}
    >
      {label}
    </Badge>
  );
}
