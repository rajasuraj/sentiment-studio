import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowRight, FileSpreadsheet, Table2, Trash2, UploadCloud } from "lucide-react";
import { uploadDatasets } from "@/lib/api";
import { useSetUpload } from "@/context/AppDataContext";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { avgTextLength, countDataRows, labelDistribution, parseCsvRows } from "@/lib/csvPreview";
import { cn } from "@/lib/cn";

function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(bytes / 1024).toFixed(1)} KB`;
}

export function UploadPage() {
  const navigate = useNavigate();
  const setUpload = useSetUpload();
  const [a, setA] = useState<File | null>(null);
  const [b, setB] = useState<File | null>(null);
  const [previewA, setPreviewA] = useState<string[][]>([]);
  const [previewB, setPreviewB] = useState<string[][]>([]);
  const [rawA, setRawA] = useState("");
  const [rawB, setRawB] = useState("");
  const [textColA, setTextColA] = useState(0);
  const [labelColA, setLabelColA] = useState(1);
  const [textColB, setTextColB] = useState(0);
  const [labelColB, setLabelColB] = useState(1);
  const [loading, setLoading] = useState(false);

  const ingestFile = useCallback(async (file: File | null, which: "a" | "b") => {
    if (!file) {
      if (which === "a") {
        setPreviewA([]);
        setRawA("");
      } else {
        setPreviewB([]);
        setRawB("");
      }
      return;
    }
    const text = await file.text();
    const rows = parseCsvRows(text, 11);
    if (which === "a") {
      setRawA(text);
      setPreviewA(rows);
      if (rows[0]?.length) {
        const max = rows[0].length - 1;
        setTextColA(0);
        setLabelColA(Math.min(1, max));
      }
    } else {
      setRawB(text);
      setPreviewB(rows);
      if (rows[0]?.length) {
        const max = rows[0].length - 1;
        setTextColB(0);
        setLabelColB(Math.min(1, max));
      }
    }
  }, []);

  const setFileA = useCallback(
    (f: File | null) => {
      setA(f);
      void ingestFile(f, "a");
    },
    [ingestFile]
  );
  const setFileB = useCallback(
    (f: File | null) => {
      setB(f);
      void ingestFile(f, "b");
    },
    [ingestFile]
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!a) {
      toast.error("Select at least dataset A (CSV).");
      return;
    }
    setLoading(true);
    const t = toast.loading("Uploading…");
    try {
      const res = await uploadDatasets(a, b ?? undefined);
      setUpload({
        columnsA: res.columns_a,
        columnsB: res.columns_b,
        rowsA: res.rows_a,
        rowsB: res.rows_b,
        mode: res.upload_mode,
      });
      const rowMsg =
        res.upload_mode === "dual"
          ? `${res.rows_a.toLocaleString()} + ${res.rows_b.toLocaleString()} rows`
          : `${res.rows_a.toLocaleString()} rows (single file)`;
      toast.success(`Uploaded · ${rowMsg}.`, { id: t });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed", { id: t });
    } finally {
      setLoading(false);
    }
  }

  const headersA = previewA[0] ?? [];
  const headersB = previewB[0] ?? [];

  const summaryA = useMemo(() => {
    if (previewA.length < 2 || !rawA) return null;
    const rows = countDataRows(rawA);
    const dist = labelDistribution(previewA, labelColA);
    const avg = avgTextLength(previewA, textColA);
    return { rows, dist, avg };
  }, [previewA, rawA, labelColA, textColA]);

  const summaryB = useMemo(() => {
    if (previewB.length < 2 || !rawB) return null;
    const rows = countDataRows(rawB);
    const dist = labelDistribution(previewB, labelColB);
    const avg = avgTextLength(previewB, textColB);
    return { rows, dist, avg };
  }, [previewB, rawB, labelColB, textColB]);

  return (
    <div className="space-y-10">
      <PageHeader
        title="Upload datasets"
        description="Drag CSVs into the zones below or browse. Dataset A is required; B is optional. Preview is local only — the API still receives full files."
        actions={
          <Button
            variant="secondary"
            size="md"
            className="gap-2 shadow-sm transition-transform duration-150 hover:-translate-y-0.5"
            onClick={() => navigate("/cleaning")}
          >
            Continue
            <ArrowRight className="h-4 w-4" />
          </Button>
        }
      />

      <div className="grid gap-8 xl:grid-cols-3">
        <div className="space-y-8 xl:col-span-2">
          <form onSubmit={onSubmit} className="space-y-8">
            <div className="grid gap-6 md:grid-cols-2">
              <DropZone
                label="Dataset A"
                required
                file={a}
                onFile={setFileA}
              />
              <DropZone
                label="Dataset B"
                file={b}
                onFile={setFileB}
              />
            </div>

            {(previewA.length > 0 || previewB.length > 0) && (
              <div className="grid gap-6 lg:grid-cols-2">
                {previewA.length > 0 ? (
                  <PreviewPanel
                    title="Dataset A · preview"
                    headers={headersA}
                    rows={previewA.slice(1, 11)}
                    textCol={textColA}
                    labelCol={labelColA}
                    onTextCol={setTextColA}
                    onLabelCol={setLabelColA}
                  />
                ) : null}
                {previewB.length > 0 ? (
                  <PreviewPanel
                    title="Dataset B · preview"
                    headers={headersB}
                    rows={previewB.slice(1, 11)}
                    textCol={textColB}
                    labelCol={labelColB}
                    onTextCol={setTextColB}
                    onLabelCol={setLabelColB}
                  />
                ) : null}
              </div>
            )}

            {(summaryA || summaryB) && (
              <div className="grid gap-4 sm:grid-cols-2">
                {summaryA ? (
                  <SummaryCard title="Dataset A · quick stats (preview)" summary={summaryA} />
                ) : null}
                {summaryB ? (
                  <SummaryCard title="Dataset B · quick stats (preview)" summary={summaryB} />
                ) : null}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-4 border-t border-slate-200/80 pt-6">
              <Button
                type="submit"
                loading={loading}
                size="lg"
                className="min-w-[160px] shadow-md transition-transform duration-150 hover:-translate-y-0.5 active:translate-y-0"
              >
                Upload to workspace
              </Button>
              <p className="text-xs text-slate-500">
                Limits from{" "}
                <code className="rounded-lg bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-600">
                  app.yaml
                </code>
                . Map columns on Cleaning after upload.
              </p>
            </div>
          </form>
        </div>

        <Card padding="p-6" className="h-fit shadow-md ring-1 ring-slate-200/40">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-accent ring-1 ring-indigo-100">
              <FileSpreadsheet className="h-5 w-5" strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-ink-950">Format & labels</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-500">
                UTF-8 CSV with a header row. Sentiment140-style dumps need{" "}
                <code className="rounded-md bg-slate-100 px-1 py-0.5 font-mono text-[10px]">
                  prepare_raw_datasets.py
                </code>
                . Large files: set{" "}
                <code className="rounded-md bg-slate-100 px-1 py-0.5 font-mono text-[10px]">VITE_API_BASE</code>{" "}
                to skip the Vite proxy.
              </p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                <Badge variant="success">positive</Badge>
                <Badge variant="danger">negative</Badge>
                <Badge variant="neutral">neutral</Badge>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function SummaryCard({
  title,
  summary,
}: {
  title: string;
  summary: { rows: number; dist: Record<string, number>; avg: number | null };
}) {
  const entries = Object.entries(summary.dist);
  return (
    <Card padding="p-6" className="shadow-md ring-1 ring-slate-200/50">
      <div className="mb-4 flex items-center gap-2 text-slate-500">
        <Table2 className="h-4 w-4" />
        <h3 className="text-xs font-bold uppercase tracking-widest">{title}</h3>
      </div>
      <dl className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="text-xs font-medium text-slate-400">Rows (approx.)</dt>
          <dd className="mt-1 font-display text-2xl font-semibold text-ink-950">
            {summary.rows.toLocaleString()}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-slate-400">Avg text length</dt>
          <dd className="mt-1 font-display text-2xl font-semibold text-ink-950">
            {summary.avg != null ? `${summary.avg.toFixed(0)} chars` : "—"}
          </dd>
        </div>
        <div className="col-span-2">
          <dt className="text-xs font-medium text-slate-400">Label mix (preview rows)</dt>
          <dd className="mt-2 flex flex-wrap gap-1.5">
            {entries.length ? (
              entries.map(([k, v]) => (
                <Badge key={k} variant="neutral" className="font-mono text-[11px]">
                  {k}: {v}
                </Badge>
              ))
            ) : (
              <span className="text-xs text-slate-400">Select label column</span>
            )}
          </dd>
        </div>
      </dl>
    </Card>
  );
}

function PreviewPanel({
  title,
  headers,
  rows,
  textCol,
  labelCol,
  onTextCol,
  onLabelCol,
}: {
  title: string;
  headers: string[];
  rows: string[][];
  textCol: number;
  labelCol: number;
  onTextCol: (n: number) => void;
  onLabelCol: (n: number) => void;
}) {
  return (
    <Card padding="p-0" className="overflow-hidden shadow-md ring-1 ring-slate-200/50">
      <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/90 px-5 py-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="font-display text-sm font-semibold text-ink-950">{title}</h3>
          <p className="mt-0.5 text-xs text-slate-500">First 10 data rows · column roles for preview stats only</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="flex flex-col text-[10px] font-bold uppercase tracking-wide text-slate-400">
            Text
            <select
              className="mt-1 rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-ink-900 shadow-sm outline-none focus:ring-2 focus:ring-[var(--ring)]"
              value={textCol}
              onChange={(e) => onTextCol(Number(e.target.value))}
            >
              {headers.map((h, i) => (
                <option key={i} value={i}>
                  {h || `col ${i}`}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col text-[10px] font-bold uppercase tracking-wide text-slate-400">
            Label
            <select
              className="mt-1 rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-ink-900 shadow-sm outline-none focus:ring-2 focus:ring-[var(--ring)]"
              value={labelCol}
              onChange={(e) => onLabelCol(Number(e.target.value))}
            >
              {headers.map((h, i) => (
                <option key={i} value={i}>
                  {h || `col ${i}`}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
      <div className="max-h-72 overflow-auto">
        <table className="w-full min-w-[320px] border-collapse text-left text-xs">
          <thead className="sticky top-0 z-10 bg-white shadow-sm">
            <tr>
              {headers.map((h, i) => (
                <th
                  key={i}
                  className="border-b border-slate-200 px-3 py-2.5 font-semibold uppercase tracking-wide text-slate-500"
                >
                  {h || `col ${i}`}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, ri) => (
              <tr
                key={ri}
                className={cn(
                  "border-b border-slate-100 transition-colors hover:bg-indigo-50/40",
                  ri % 2 === 1 ? "bg-slate-50/50" : "bg-white"
                )}
              >
                {headers.map((_, ci) => (
                  <td key={ci} className="max-w-[10rem] truncate px-3 py-2 text-slate-700">
                    {r[ci] ?? ""}
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

function DropZone({
  label,
  required,
  file,
  onFile,
}: {
  label: string;
  required?: boolean;
  file: File | null;
  onFile: (f: File | null) => void;
}) {
  const [over, setOver] = useState(false);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-ink-950">{label}</span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
          {required ? "Required" : "Optional"}
        </span>
      </div>
      <label
        className={cn(
          "group relative flex min-h-[168px] cursor-pointer flex-col rounded-2xl border-2 border-dashed px-5 py-6 transition-all duration-200",
          over
            ? "border-accent bg-accent-muted/50 shadow-md"
            : "border-slate-200/90 bg-white/80 hover:border-slate-300 hover:bg-white hover:shadow-md"
        )}
        onDragEnter={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          const f = e.dataTransfer.files?.[0];
          if (f && (f.name.endsWith(".csv") || f.type === "text/csv")) onFile(f);
          else toast.error("Please drop a .csv file.");
        }}
      >
        <input
          type="file"
          accept=".csv,text/csv"
          className="absolute inset-0 cursor-pointer opacity-0"
          onChange={(e) => onFile(e.target.files?.[0] ?? null)}
        />
        <div className="pointer-events-none flex flex-1 flex-col items-center justify-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 ring-1 ring-slate-200/80 transition-transform duration-200 group-hover:scale-105 group-hover:bg-indigo-50 group-hover:text-accent">
            <UploadCloud className="h-6 w-6 opacity-80" strokeWidth={1.5} />
          </div>
          <p className="text-sm font-semibold text-ink-900">
            {file ? file.name : "Drop CSV here or click to browse"}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {file ? formatFileSize(file.size) : "Comma-separated values"}
          </p>
        </div>
      </label>
      {file ? (
        <div className="mt-3 flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm ring-1 ring-slate-100">
          <div className="flex min-w-0 items-center gap-3">
            <FileSpreadsheet className="h-8 w-8 shrink-0 text-accent" strokeWidth={1.25} />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-ink-900">{file.name}</p>
              <p className="text-xs text-slate-500">{formatFileSize(file.size)}</p>
            </div>
            <Badge variant="success" className="hidden shrink-0 sm:inline-flex">
              Ready
            </Badge>
          </div>
          <button
            type="button"
            className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
            onClick={(e) => {
              e.preventDefault();
              onFile(null);
            }}
            aria-label={`Remove ${label}`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
