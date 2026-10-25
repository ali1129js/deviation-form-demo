import { FIELD_LABEL, type FieldName, type Report } from "./schema";

const ORDER: FieldName[] = ["orderId", "batch", "materialNo", "line", "shift", "date", "category", "description", "measures", "reportedBy", "shiftLead"];

export const formatDate = (iso: string) => {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : iso;
};

/** Rows for the print view; empty values become a line to fill in by hand. */
export function printRows(r: Report): { label: string; value: string }[] {
  return ORDER.map((f) => {
    const raw = String(r.data[f] ?? "").trim();
    return { label: FIELD_LABEL[f], value: raw ? (f === "date" ? formatDate(raw) : raw) : "______________" };
  });
}
