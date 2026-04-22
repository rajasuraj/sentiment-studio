const BASE = import.meta.env.VITE_API_BASE ?? "";

/** Turn FastAPI / plain error bodies into a short string for toasts. */
export function formatApiErrorBody(text: string, statusText: string): string {
  const raw = text.trim();
  if (!raw) return statusText || "Request failed";
  try {
    const j = JSON.parse(raw) as Record<string, unknown>;
    const detail = j.detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      const parts = detail.map((item) => {
        if (item && typeof item === "object" && "msg" in item) {
          const o = item as { loc?: unknown[]; msg?: unknown };
          const loc = Array.isArray(o.loc)
            ? o.loc.filter((x): x is string => typeof x === "string" && x !== "body").join(" · ")
            : "";
          const msg = String(o.msg ?? "Invalid request");
          return loc ? `${loc}: ${msg}` : msg;
        }
        return String(item);
      });
      const joined = parts.filter(Boolean).join(" · ");
      if (joined) return joined;
    }
  } catch {
    /* not JSON */
  }
  return raw.length > 320 ? `${raw.slice(0, 317)}…` : raw;
}

async function parse<T>(r: Response): Promise<T> {
  if (!r.ok) {
    const t = await r.text();
    throw new Error(formatApiErrorBody(t, r.statusText));
  }
  return r.json() as Promise<T>;
}

export type UploadResult = {
  status: string;
  upload_mode: "single" | "dual";
  columns_a: string[];
  columns_b: string[];
  rows_a: number;
  rows_b: number;
};

export async function uploadDatasets(fileA: File, fileB?: File | null): Promise<UploadResult> {
  const fd = new FormData();
  fd.append("file_a", fileA);
  if (fileB) {
    fd.append("file_b", fileB);
  }
  const r = await fetch(`${BASE}/api/upload`, { method: "POST", body: fd });
  return parse(r);
}

export async function cleanDatasets(body: {
  dataset_a: { text_column: string; label_column: string };
  dataset_b?: { text_column: string; label_column: string } | null;
}) {
  const r = await fetch(`${BASE}/api/clean`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return parse(r);
}

export async function trainMl() {
  const r = await fetch(`${BASE}/api/train-ml`, { method: "POST" });
  return parse(r);
}

export async function trainDl() {
  const r = await fetch(`${BASE}/api/train-dl`, { method: "POST" });
  return parse(r);
}

export async function fetchMetrics() {
  const r = await fetch(`${BASE}/api/metrics`);
  return parse(r);
}

export async function predictMl(text: string) {
  const r = await fetch(`${BASE}/api/predict-ml`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  return parse(r);
}

export async function predictDl(text: string) {
  const r = await fetch(`${BASE}/api/predict-dl`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  return parse(r);
}

export async function fetchLogs(limit = 100) {
  const r = await fetch(`${BASE}/api/logs?limit=${limit}`);
  return parse(r);
}

export async function fetchManifest() {
  const r = await fetch(`${BASE}/api/manifest`);
  return parse(r);
}
