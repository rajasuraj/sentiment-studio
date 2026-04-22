import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/cn";

const BASE = import.meta.env.VITE_API_BASE ?? "";

export function ApiStatusBadge() {
  const [ok, setOk] = useState<boolean | null>(null);

  const ping = useCallback(async () => {
    try {
      const r = await fetch(`${BASE}/healthcheck`, { method: "GET" });
      const j = (await r.json()) as { status?: string };
      setOk(r.ok && j.status === "ok");
    } catch {
      setOk(false);
    }
  }, []);

  useEffect(() => {
    void ping();
    const id = window.setInterval(() => void ping(), 20000);
    return () => window.clearInterval(id);
  }, [ping]);

  if (ok === null) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-slate-200/90 bg-white px-3 py-1.5 text-xs font-semibold text-slate-500 shadow-sm">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-slate-300 opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-slate-400" />
        </span>
        API · checking…
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold shadow-sm transition-colors duration-200",
        ok
          ? "border-emerald-200/80 bg-emerald-50/90 text-emerald-900"
          : "border-rose-200/80 bg-rose-50/90 text-rose-900"
      )}
    >
      <span
        className={cn(
          "h-2 w-2 rounded-full",
          ok ? "bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.25)]" : "bg-rose-500"
        )}
      />
      {ok ? "API connected" : "API unreachable"}
    </span>
  );
}
