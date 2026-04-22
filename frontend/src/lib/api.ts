const BASE = import.meta.env.VITE_API_BASE ?? "";

async function parse<T>(r: Response): Promise<T> {
  if (!r.ok) {
    const t = await r.text();
    throw new Error(t || r.statusText);
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
