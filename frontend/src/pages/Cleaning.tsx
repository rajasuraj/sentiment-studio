import type { ReactNode } from "react";
import { useMemo, useState } from "react";

type CleanStats = {
  total_samples: number;
  class_distribution: Record<string, number>;
  average_text_length_chars?: number;
};
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowRight,
  ArrowRightLeft,
  Database,
  Filter,
  Layers,
  Sparkles,
  Wand2,
} from "lucide-react";
import { cleanDatasets } from "@/lib/api";
import { useAppData } from "@/context/AppDataContext";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";

export function CleaningPage() {
  const navigate = useNavigate();
  const { upload } = useAppData();
  const [ta, setTa] = useState("");
  const [la, setLa] = useState("");
  const [tb, setTb] = useState("");
  const [lb, setLb] = useState("");
  const [busy, setBusy] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const [last, setLast] = useState<{ rows: number; stats: CleanStats } | null>(null);

  const colsA = upload?.columnsA ?? [];
  const colsB = upload?.columnsB ?? [];
  const dual = upload?.mode === "dual";
  const ready = useMemo(
    () => Boolean(colsA.length && (dual ? colsB.length : true)),
    [colsA.length, colsB.length, dual]
  );

  const beforeRows = useMemo(() => {
    if (!upload) return 0;
    return upload.rowsA + upload.rowsB;
  }, [upload]);

  async function run() {
    setBusy(true);
    const t = toast.loading(dual ? "Cleaning and merging datasets…" : "Cleaning dataset…");
    try {
      const res = (await cleanDatasets(
        dual
          ? {
              dataset_a: { text_column: ta, label_column: la },
              dataset_b: { text_column: tb, label_column: lb },
            }
          : {
              dataset_a: { text_column: ta, label_column: la },
            }
      )) as { rows: number; dataset_stats: CleanStats };
      setLast({ rows: res.rows, stats: res.dataset_stats });
      toast.success(
        `Ready · ${res.rows.toLocaleString()} rows after deduplication (${res.dataset_stats.total_samples.toLocaleString()} in stats).`,
        { id: t }
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Cleaning failed", { id: t });
    } finally {
      setBusy(false);
    }
  }

  const canRun = dual ? ta && la && tb && lb : ta && la;
  const dupRemoved =
    last && beforeRows > 0 ? Math.max(0, beforeRows - last.rows) : null;

  if (!ready) {
    return (
      <div className="space-y-10">
        <PageHeader
          title="Cleaning"
          description="Map text and label columns, then normalize (and merge if you uploaded two files)."
        />
        <EmptyState
          icon={Database}
          title="No dataset in workspace"
          description="Upload at least one CSV on the Upload page first. If you uploaded two files, both must parse successfully before mapping."
          action={
            <Link to="/">
              <Button variant="primary" size="md">
                Go to Upload
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <PageHeader
        title="Map columns & clean"
        description={
          dual
            ? "Select the text and label column for each source. We normalize text, drop duplicates, and concatenate into one training table."
            : "Single-file workflow: map text and label for dataset A only. We normalize text and drop duplicates."
        }
        actions={
          <Button
            variant="secondary"
            size="md"
            className="gap-2 shadow-sm transition-transform duration-150 hover:-translate-y-0.5"
            onClick={() => navigate("/train")}
          >
            Train models
            <ArrowRight className="h-4 w-4" />
          </Button>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm ring-1 ring-slate-100">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
            Pipeline
          </span>
          <button
            type="button"
            onClick={() => setAdvanced(false)}
            className={cn(
              "rounded-xl px-3 py-1.5 text-xs font-semibold transition-all",
              !advanced ? "bg-ink-900 text-white shadow-md" : "text-slate-500 hover:bg-slate-50"
            )}
          >
            Standard
          </button>
          <button
            type="button"
            onClick={() => setAdvanced(true)}
            className={cn(
              "rounded-xl px-3 py-1.5 text-xs font-semibold transition-all",
              advanced ? "bg-accent text-white shadow-md" : "text-slate-500 hover:bg-slate-50"
            )}
          >
            Advanced view
          </button>
        </div>
        <p className="text-xs text-slate-500">
          {advanced
            ? "Same backend pipeline — toggles extra context cards below."
            : "URLs, @mentions, #hashtags, emojis stripped; letters lowercased."}
        </p>
      </div>

      <div className={`grid gap-6 ${dual ? "lg:grid-cols-2" : "lg:grid-cols-1 max-w-xl"}`}>
        <Card padding="p-6" className="shadow-md ring-1 ring-slate-200/50">
          <div className="mb-5 flex items-center gap-2">
            <Layers className="h-4 w-4 text-accent" />
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Dataset A</h2>
          </div>
          <div className="space-y-4">
            <FieldSelect label="Text column" value={ta} onChange={setTa} options={colsA} />
            <FieldSelect label="Label column" value={la} onChange={setLa} options={colsA} />
          </div>
          <div className="mt-4 flex flex-wrap gap-1.5">
            <span className="text-[10px] font-bold uppercase text-slate-400">Labels</span>
            <Badge variant="success">positive</Badge>
            <Badge variant="danger">negative</Badge>
            <Badge variant="neutral">neutral</Badge>
          </div>
        </Card>
        {dual ? (
          <Card padding="p-6" className="shadow-md ring-1 ring-slate-200/50">
            <div className="mb-5 flex items-center gap-2">
              <Layers className="h-4 w-4 text-sky-600" />
              <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Dataset B</h2>
            </div>
            <div className="space-y-4">
              <FieldSelect label="Text column" value={tb} onChange={setTb} options={colsB} />
              <FieldSelect label="Label column" value={lb} onChange={setLb} options={colsB} />
            </div>
            <div className="mt-4 flex flex-wrap gap-1.5">
              <Badge variant="success">positive</Badge>
              <Badge variant="danger">negative</Badge>
              <Badge variant="neutral">neutral</Badge>
            </div>
          </Card>
        ) : null}
      </div>

      {(last || advanced) && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card padding="p-6" className="border border-slate-200/80 bg-slate-50/60 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-slate-500">
              <Filter className="h-4 w-4" />
              <h3 className="text-xs font-bold uppercase tracking-widest">Before</h3>
            </div>
            <p className="font-display text-3xl font-semibold text-ink-950">
              {beforeRows.toLocaleString()}
            </p>
            <p className="mt-1 text-sm text-slate-500">Raw rows in workspace (A + B)</p>
          </Card>
          <Card
            padding="p-6"
            className={cn(
              "border shadow-md transition-colors",
              last ? "border-emerald-200/80 bg-emerald-50/40" : "border-dashed border-slate-200 bg-white"
            )}
          >
            <div className="mb-3 flex items-center gap-2 text-slate-500">
              <Wand2 className="h-4 w-4 text-accent" />
              <h3 className="text-xs font-bold uppercase tracking-widest">After</h3>
            </div>
            {last ? (
              <>
                <p className="font-display text-3xl font-semibold text-ink-950">
                  {last.rows.toLocaleString()}
                </p>
                <p className="mt-1 text-sm text-slate-600">Rows after dedupe + cleaning</p>
              </>
            ) : (
              <p className="text-sm text-slate-400">Run the pipeline to populate this card.</p>
            )}
          </Card>
        </div>
      )}

      {last ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <MetricPill
            icon={<ArrowRightLeft className="h-4 w-4" />}
            label="Duplicates collapsed"
            value={dupRemoved != null ? dupRemoved.toLocaleString() : "—"}
            hint="Approx. raw − cleaned"
          />
          <MetricPill
            icon={<Sparkles className="h-4 w-4" />}
            label="Avg text length"
            value={
              last.stats.average_text_length_chars != null
                ? `${last.stats.average_text_length_chars.toFixed(0)} chars`
                : "—"
            }
            hint="After normalization"
          />
          <MetricPill
            icon={<Layers className="h-4 w-4" />}
            label="Classes"
            value={`${Object.keys(last.stats.class_distribution || {}).length}`}
            hint="Distinct labels"
          />
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="primary"
          size="lg"
          loading={busy}
          disabled={!canRun}
          onClick={run}
          className="min-w-[200px] shadow-md transition-transform duration-150 hover:-translate-y-0.5"
        >
          Run cleaning pipeline
        </Button>
      </div>
    </div>
  );
}

function MetricPill({
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
    <Card padding="p-5" className="shadow-sm ring-1 ring-slate-100">
      <div className="flex items-center gap-2 text-slate-400">{icon}</div>
      <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-1 font-display text-xl font-semibold text-ink-950">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
    </Card>
  );
}

function FieldSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <select
        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-ink-900 shadow-sm outline-none transition-shadow focus:border-indigo-300 focus:shadow-md focus:ring-2 focus:ring-[var(--ring)]"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Select column…</option>
        {options.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
    </label>
  );
}
