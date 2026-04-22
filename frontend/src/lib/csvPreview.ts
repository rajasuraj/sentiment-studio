/**
 * Lightweight CSV line split for client-side previews (not a full RFC 4180 parser).
 */
export function parseCsvRows(text: string, maxLines: number): string[][] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const take = Math.min(lines.length, maxLines);
  const out: string[][] = [];
  for (let i = 0; i < take; i++) {
    out.push(splitCsvLine(lines[i]));
  }
  return out;
}

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      cells.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  cells.push(cur.trim());
  return cells.map((c) => c.replace(/^"|"$/g, "").trim());
}

export function countDataRows(text: string): number {
  const n = text.split(/\r?\n/).filter((l) => l.trim().length > 0).length;
  return Math.max(0, n - 1);
}

export function labelDistribution(
  rows: string[][],
  labelColIndex: number
): Record<string, number> {
  const dist: Record<string, number> = {};
  if (rows.length < 2 || labelColIndex < 0) return dist;
  for (let r = 1; r < rows.length; r++) {
    const lab = rows[r][labelColIndex]?.toLowerCase() ?? "";
    if (!lab) continue;
    dist[lab] = (dist[lab] ?? 0) + 1;
  }
  return dist;
}

export function avgTextLength(
  rows: string[][],
  textColIndex: number
): number | null {
  if (rows.length < 2 || textColIndex < 0) return null;
  let sum = 0;
  let n = 0;
  for (let r = 1; r < rows.length; r++) {
    const t = rows[r][textColIndex] ?? "";
    if (t) {
      sum += t.length;
      n++;
    }
  }
  return n ? sum / n : null;
}
