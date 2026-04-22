import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import {
  AlertCircle,
  BarChart3,
  Cpu,
  Database,
  RefreshCw,
  Sparkles,
  Trophy,
} from "lucide-react";
import { fetchMetrics } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { DashboardSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";

type Metrics = {
  accuracy: number;
  macro_f1: number;
  labels: string[];
  confusion_matrix: number[][];
  per_class: Record<string, { precision: number; recall: number; f1: number }>;
  training_time_seconds?: number;
  inference_ms_per_sample?: number;
  model_size_mb?: number;
};

type Payload = {
  class_distribution: Record<string, number>;
  text_length_histogram: { edges: number[]; counts: number[] };
  ml_metrics: Metrics | null;
  dl_metrics: Metrics | null;
  deployment: { winner: string; summary: string; rationale: string[] };
};

const tipStyle = {
  backgroundColor: "#fff",
  border: "1px solid rgba(15,23,42,0.08)",
  borderRadius: "12px",
  fontSize: "12px",
  boxShadow: "0 4px 24px rgba(15,23,42,0.06)",
};

export function DashboardPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (): Promise<boolean> => {
    setLoading(true);
    setErr(null);
    try {
      const d = (await fetchMetrics()) as Payload;
      setData(d);
      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load metrics";
      setErr(msg);
      toast.error(msg);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !data) {
    return <DashboardSkeleton />;
  }

  if (err && !data) {
    return (
      <div className="space-y-8">
        <PageHeader title="Dashboard" description="Compare models and review dataset health." />
        <EmptyState
          icon={AlertCircle}
          title="Could not load metrics"
          description={err}
          action={
            <Button variant="primary" size="md" onClick={() => void load()}>
              Retry
            </Button>
          }
        />
      </div>
    );
  }

  if (!data) return null;

  const classData = Object.entries(data.class_distribution || {}).map(
    ([name, value]) => ({ name, value })
  );

  const histMid =
    data.text_length_histogram?.edges?.length > 1
      ? data.text_length_histogram.edges.slice(0, -1).map((e, i) => ({
          bin: `${Math.round(e)}–${Math.round(data.text_length_histogram.edges[i + 1])}`,
          count: data.text_length_histogram.counts[i] ?? 0,
        }))
      : [];

  const totalRows = Object.values(data.class_distribution || {}).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-10">
      <PageHeader
        title="Dashboard"
        description="Class balance, text length profile, per-model quality, confusion views, and a concise deployment recommendation."
        actions={
          <Button
            variant="secondary"
            size="md"
            className="gap-2"
            loading={loading}
            onClick={() =>
              void load().then((ok) => {
                if (ok) toast.success("Metrics refreshed");
              })
            }
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          icon={<Database className="h-5 w-5 text-indigo-500" strokeWidth={1.5} />}
          label="Total samples"
          value={totalRows ? totalRows.toLocaleString() : "—"}
          hint="Merged labels after cleaning"
        />
        <MetricCard
          icon={<Cpu className="h-5 w-5 text-slate-600" strokeWidth={1.5} />}
          label="Accuracy · ML"
          value={data.ml_metrics ? data.ml_metrics.accuracy.toFixed(3) : "—"}
          hint="Hold-out evaluation"
        />
        <MetricCard
          icon={<Sparkles className="h-5 w-5 text-violet-500" strokeWidth={1.5} />}
          label="Accuracy · DL"
          value={data.dl_metrics ? data.dl_metrics.accuracy.toFixed(3) : "—"}
          hint="Hold-out evaluation"
        />
        <MetricCard
          icon={<Trophy className="h-5 w-5 text-amber-500" strokeWidth={1.5} />}
          label="Best model"
          value={data.deployment.winner === "none" ? "—" : data.deployment.winner.toUpperCase()}
          hint="Quality vs latency vs size"
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Class distribution" description="Label counts in the merged training table." />
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={classData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tipStyle} cursor={{ fill: "rgba(148,163,184,0.12)" }} />
                <Bar dataKey="value" fill="#4f46e5" radius={[8, 8, 0, 0]} maxBarSize={48} name="Count" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="Text length" description="Character length distribution after cleaning." />
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={histMid} margin={{ top: 8, right: 8, left: 0, bottom: 48 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="bin"
                  tick={{ fontSize: 9, fill: "#64748b" }}
                  interval={0}
                  angle={-30}
                  textAnchor="end"
                  height={56}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tipStyle} cursor={{ fill: "rgba(14,165,233,0.1)" }} />
                <Bar dataKey="count" fill="#0ea5e9" radius={[8, 8, 0, 0]} maxBarSize={40} name="Rows" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </section>

      <section>
        <Card padding="p-6">
          <CardHeader
            title="Model comparison"
            description="Side-by-side quality signals on the same hold-out split."
            action={
              <span className="inline-flex items-center gap-2 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-sm bg-ink-900" /> ML
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-sm bg-accent" /> DL
                </span>
              </span>
            }
          />
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={modelCompareBars(data.ml_metrics, data.dl_metrics)}
                margin={{ top: 12, right: 12, left: 0, bottom: 8 }}
                barGap={10}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12, fill: "#64748b" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 1]}
                  tickFormatter={(v) => v.toFixed(2)}
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip contentStyle={tipStyle} cursor={{ fill: "rgba(148,163,184,0.1)" }} />
                <Bar dataKey="ml" fill="#0f172a" radius={[8, 8, 0, 0]} maxBarSize={36} name="ML" />
                <Bar dataKey="dl" fill="#6366f1" radius={[8, 8, 0, 0]} maxBarSize={36} name="DL" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </section>

      <section>
        <Card padding="p-0" className="overflow-hidden shadow-md">
          <div className="border-b border-slate-100 bg-slate-50/90 px-6 py-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-slate-500" strokeWidth={1.5} />
              <h3 className="font-display text-base font-semibold text-ink-950">Comparison table</h3>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Macro averages from per-class scores, plus training and runtime footprint.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="sticky top-0 z-[1] border-b border-slate-100 bg-white/95 backdrop-blur-sm">
                <tr className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  <th className="px-6 py-3.5">Model</th>
                  <th className="px-6 py-3.5">Precision</th>
                  <th className="px-6 py-3.5">Recall</th>
                  <th className="px-6 py-3.5">F1</th>
                  <th className="px-6 py-3.5">Train (s)</th>
                  <th className="px-6 py-3.5">Infer (ms)</th>
                  <th className="px-6 py-3.5">Size (MB)</th>
                </tr>
              </thead>
              <tbody>
                <ModelCompareRow label="ML · TF-IDF + linear" m={data.ml_metrics} zebra />
                <ModelCompareRow label="DL · Transformer" m={data.dl_metrics} />
              </tbody>
            </table>
          </div>
        </Card>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <ModelCard title="ML · TF-IDF + linear" m={data.ml_metrics} />
        <ModelCard title="DL · Transformer" m={data.dl_metrics} />
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <ConfusionCard title="ML confusion" m={data.ml_metrics} />
        <ConfusionCard title="DL confusion" m={data.dl_metrics} />
      </section>

      <Card className="border-l-[3px] border-l-accent shadow-md">
        <CardHeader
          title="Final recommendation"
          description="Balanced view of accuracy vs speed vs model size."
          action={
            <Badge variant={data.deployment.winner === "none" ? "default" : "accent"}>
              {data.deployment.winner}
            </Badge>
          }
        />
        <p className="text-sm leading-relaxed text-slate-600">{data.deployment.summary}</p>
        {data.deployment.rationale.length > 0 ? (
          <ul className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-sm text-slate-500">
            {data.deployment.rationale.map((r, i) => (
              <li key={i} className="flex gap-2">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-300" />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </Card>
    </div>
  );
}

function macroAvg(m: Metrics | null, key: "precision" | "recall" | "f1"): string {
  if (!m?.labels?.length) return "—";
  let s = 0;
  for (const lab of m.labels) s += m.per_class[lab]?.[key] ?? 0;
  return (s / m.labels.length).toFixed(3);
}

function modelCompareBars(ml: Metrics | null, dl: Metrics | null) {
  return [
    { name: "Accuracy", ml: ml?.accuracy ?? 0, dl: dl?.accuracy ?? 0 },
    { name: "Macro F1", ml: ml?.macro_f1 ?? 0, dl: dl?.macro_f1 ?? 0 },
  ];
}

function MetricCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <Card padding="p-6" hover className="shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">{label}</p>
          <p className="mt-2 font-display text-2xl font-semibold tracking-tight text-ink-950">{value}</p>
          <p className="mt-1 text-xs text-slate-500">{hint}</p>
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-50 ring-1 ring-slate-100">
          {icon}
        </div>
      </div>
    </Card>
  );
}

function ModelCompareRow({
  label,
  m,
  zebra,
}: {
  label: string;
  m: Metrics | null;
  zebra?: boolean;
}) {
  return (
    <tr
      className={
        zebra
          ? "border-t border-slate-100 bg-slate-50/40 transition-colors hover:bg-slate-50/90"
          : "border-t border-slate-100 transition-colors hover:bg-slate-50/60"
      }
    >
      <td className="px-6 py-3.5 font-medium text-ink-900">{label}</td>
      <td className="px-6 py-3.5 font-mono text-sm text-ink-800">{macroAvg(m, "precision")}</td>
      <td className="px-6 py-3.5 font-mono text-sm text-ink-800">{macroAvg(m, "recall")}</td>
      <td className="px-6 py-3.5 font-mono text-sm font-semibold text-ink-950">
        {m ? m.macro_f1.toFixed(3) : "—"}
      </td>
      <td className="px-6 py-3.5 text-slate-600">{m ? (m.training_time_seconds ?? 0).toFixed(1) : "—"}</td>
      <td className="px-6 py-3.5 text-slate-600">{m ? (m.inference_ms_per_sample ?? 0).toFixed(2) : "—"}</td>
      <td className="px-6 py-3.5 text-slate-600">{m ? (m.model_size_mb ?? 0).toFixed(2) : "—"}</td>
    </tr>
  );
}

function ModelCard({ title, m }: { title: string; m: Metrics | null }) {
  if (!m || !m.labels?.length) {
    return (
      <Card className="border-dashed">
        <CardHeader title={title} description="Train this model to populate metrics." />
        <p className="text-sm text-slate-400">No evaluation available yet.</p>
      </Card>
    );
  }
  const rows = m.labels.map((lab) => ({ lab, ...m.per_class[lab] }));
  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b border-slate-100 bg-slate-50/80 px-6 py-4">
        <h3 className="font-display text-base font-semibold text-ink-950">{title}</h3>
      </div>
      <div className="overflow-x-auto px-6 py-4">
        <table className="w-full min-w-[280px] text-sm">
          <thead>
            <tr className="text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              <th className="pb-3 pr-3">Class</th>
              <th className="pb-3 pr-3">Precision</th>
              <th className="pb-3 pr-3">Recall</th>
              <th className="pb-3">F1</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.lab} className="border-t border-slate-100">
                <td className="py-2.5 pr-3">
                  <Badge variant="neutral">{r.lab}</Badge>
                </td>
                <td className="py-2.5 pr-3 font-medium text-ink-800">{r.precision.toFixed(3)}</td>
                <td className="py-2.5 pr-3 font-medium text-ink-800">{r.recall.toFixed(3)}</td>
                <td className="py-2.5 font-semibold text-ink-950">{r.f1.toFixed(3)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <dl className="grid grid-cols-2 gap-3 border-t border-slate-100 bg-slate-50/50 px-6 py-4 text-xs sm:grid-cols-5">
        <div>
          <dt className="text-slate-400">Accuracy</dt>
          <dd className="mt-0.5 font-semibold text-ink-900">{m.accuracy.toFixed(3)}</dd>
        </div>
        <div>
          <dt className="text-slate-400">Macro F1</dt>
          <dd className="mt-0.5 font-semibold text-ink-900">{m.macro_f1.toFixed(3)}</dd>
        </div>
        <div>
          <dt className="text-slate-400">Train (s)</dt>
          <dd className="mt-0.5 font-semibold text-ink-900">{(m.training_time_seconds ?? 0).toFixed(1)}</dd>
        </div>
        <div>
          <dt className="text-slate-400">Infer ms</dt>
          <dd className="mt-0.5 font-semibold text-ink-900">{(m.inference_ms_per_sample ?? 0).toFixed(2)}</dd>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <dt className="text-slate-400">Size (MB)</dt>
          <dd className="mt-0.5 font-semibold text-ink-900">{(m.model_size_mb ?? 0).toFixed(2)}</dd>
        </div>
      </dl>
    </Card>
  );
}

function ConfusionCard({ title, m }: { title: string; m: Metrics | null }) {
  if (!m || !m.labels?.length || !m.confusion_matrix?.length) {
    return (
      <Card className="border-dashed">
        <CardHeader title={title} description="Train and evaluate to render the matrix." />
        <p className="text-sm text-slate-400">Not available.</p>
      </Card>
    );
  }
  const labels = m.labels;
  const maxVal = Math.max(...m.confusion_matrix.flat(), 1);
  return (
    <Card padding="p-6">
      <CardHeader title={title} description="True vs. predicted label counts on the test split." />
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>
              <th className="p-2" />
              {labels.map((l) => (
                <th key={l} className="p-2 text-center font-medium text-slate-400">
                  Pred · {l}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {m.confusion_matrix.map((row, i) => (
              <tr key={i}>
                <th className="whitespace-nowrap p-2 text-left font-medium text-slate-500">
                  True · {labels[i]}
                </th>
                {row.map((cell, j) => (
                  <td key={j} className="p-1">
                    <div
                      className="flex h-11 min-w-[2.75rem] items-center justify-center rounded-xl border border-slate-100/80 text-sm font-semibold text-ink-900 shadow-sm"
                      style={{
                        backgroundColor: `rgba(79, 70, 229, ${0.1 + (cell / maxVal) * 0.42})`,
                      }}
                    >
                      {cell}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
