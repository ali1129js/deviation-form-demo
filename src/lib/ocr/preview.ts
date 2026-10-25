import { FIELD_LABEL, type ReportData } from "../schema";
import { IMPORT_FIELDS, type ExtractedValue, type ImportField, type ImportResult } from "./types";

export type PreviewStatus = "leer" | "gleich" | "abweichend";
export interface PreviewRow {
  field: ImportField; label: string; next: ExtractedValue; current: string;
  status: PreviewStatus; preselected: boolean; selectable: boolean;
}

/** Builds preview rows; filled form fields are never preselected for overwrite. */
export function previewRows(r: ImportResult, current: ReportData): PreviewRow[] {
  return IMPORT_FIELDS.flatMap((field) => {
    const next = r.values[field];
    if (!next) return [];
    const cur = String(current[field] ?? "").trim();
    const status: PreviewStatus = !cur ? "leer" : cur === next.value ? "gleich" : "abweichend";
    const selectable = status !== "gleich" && next.value !== "";
    return [{ field, label: FIELD_LABEL[field], next, current: cur, status, selectable,
      preselected: selectable && status === "leer" }];
  });
}

export function applySelection(data: ReportData, rows: PreviewRow[], selected: Set<ImportField>): ReportData {
  const out = { ...data } as Record<string, string>;
  for (const r of rows) if (r.selectable && selected.has(r.field)) out[r.field] = r.next.value;
  return out as ReportData;
}
