import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ScrollText } from "lucide-react";
import { fetchLogs } from "@/lib/api";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

type Row = {
  id: number;
  input_text: string;
  prediction: string;
  model_used: string;
  inference_time_ms: number;
  created_at: number;
};

type ModelFilter = "all" | "ml" | "dl";

export function LogsPage() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [filter, setFilter] = useState<ModelFilter>("all");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = (await fetchLogs(150)) as { items: Row[] };
        if (!cancelled) setRows(r.items);
      } catch (e) {
        if (!cancelled) {
          setRows([]);
          toast.error(e instanceof Error ? e.message : "Failed to load logs");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const displayed = useMemo(() => {
    if (!rows) return [];
    const sorted = [...rows].sort((a, b) => b.created_at - a.created_at);
    if (filter === "all") return sorted;
    return sorted.filter((r) => r.model_used === filter);
  }, [rows, filter]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Prediction logs"
        description="Read-only audit trail persisted by the API for compliance and debugging. Latest entries first."
      />

      {rows === null ? (
        <Card padding="p-0" className="overflow-hidden shadow-md">
          <div className="border-b border-slate-100 px-6 py-4">
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="space-y-2 p-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </Card>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title="No predictions yet"
          description="Run inference from the Predict page. Each call creates a row here with model, label, latency, and timestamp."
        />
      ) : (
        <Card padding="p-0" className="overflow-hidden shadow-md">
          <div className="border-b border-slate-100 bg-slate-50/80 px-6 py-5">
            <CardHeader
              title="History"
              description={`${displayed.length} row${displayed.length === 1 ? "" : "s"} shown · sorted newest first`}
            />
            <div className="mt-4 flex flex-wrap gap-2">
              <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>
                All
              </FilterChip>
              <FilterChip active={filter === "ml"} onClick={() => setFilter("ml")}>
                ML
              </FilterChip>
              <FilterChip active={filter === "dl"} onClick={() => setFilter("dl")}>
                DL
              </FilterChip>
            </div>
          </div>
          <div className="max-h-[min(70vh,560px)] overflow-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur-md">
                <tr className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-3.5">Text</th>
                  <th className="px-5 py-3.5">Prediction</th>
                  <th className="px-5 py-3.5">Model</th>
                  <th className="px-5 py-3.5">Latency</th>
                  <th className="px-5 py-3.5">Time</th>
                </tr>
              </thead>
              <tbody>
                {displayed.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center text-sm text-slate-500">
                      No rows for this filter. Try <span className="font-medium text-ink-800">All</span>.
                    </td>
                  </tr>
                ) : (
                  displayed.map((r, i) => (
                    <tr
                      key={r.id}
                      className={cn(
                        "border-b border-slate-100/90 transition-colors hover:bg-slate-50/90",
                        i % 2 === 1 && "bg-slate-50/35"
                      )}
                    >
                      <td
                        className="max-w-[min(28rem,40vw)] truncate px-5 py-3 text-xs text-slate-600"
                        title={r.input_text}
                      >
                        {r.input_text}
                      </td>
                      <td className="px-5 py-3 font-medium text-ink-900">{r.prediction}</td>
                      <td className="px-5 py-3">
                        <Badge variant={r.model_used === "dl" ? "accent" : "neutral"}>
                          {r.model_used}
                        </Badge>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-slate-600">
                        {r.inference_time_ms.toFixed(2)} ms
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-xs text-slate-500">
                        {new Date(r.created_at * 1000).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

function FilterChip({
  children,
  active,
  onClick,
}: {
  children: ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant={active ? "dark" : "secondary"}
      size="sm"
      onClick={onClick}
      className={cn("rounded-full px-4", !active && "bg-white")}
    >
      {children}
    </Button>
  );
}
