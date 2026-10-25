import type { FieldName } from "../schema";

export const IMPORT_FIELDS = ["orderId", "materialNo", "materialName", "batch", "quantity", "unit", "line", "shift", "date"] as const satisfies readonly FieldName[];
export type ImportField = (typeof IMPORT_FIELDS)[number];

export type Confidence = "hoch" | "mittel" | "niedrig";
export interface ExtractedValue { value: string; confidence: Confidence; hint?: string; raw?: string }
export type ImportValues = Partial<Record<ImportField, ExtractedValue>>;
export interface ImportResult { source: string; values: ImportValues }

export type ImportErrorKind = "not_pdf" | "unreadable" | "no_text" | "no_fields";
export class ImportError extends Error {
  constructor(readonly kind: ImportErrorKind, message: string) { super(message); this.name = "ImportError"; }
}
