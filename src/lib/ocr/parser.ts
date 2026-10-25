import { LINES, SHIFTS } from "../schema";
import { ImportError, type ImportResult, type ImportValues } from "./types";

/** Normalises typical OCR confusions inside digit sequences (O→0, l/I→1, S→5, B→8). */
export function fixDigits(s: string): string {
  return s.replace(/[OoQ]/g, "0").replace(/[lI|]/g, "1").replace(/S/g, "5").replace(/B/g, "8");
}

const find = (text: string, re: RegExp) => text.match(re)?.[1]?.trim();

/** Extracts the header fields of a (fictional) production order sheet from plain text. */
export function parseOrderText(text: string, source: string): ImportResult {
  const v: ImportValues = {};
  const t = text.replace(/\r/g, "");

  const order = find(t, /Auftrag(?:s-?nr\.?)?\s*[:.]?\s*([0-9OoIlSB|]{6,10})\b/i);
  if (order) {
    const value = fixDigits(order);
    v.orderId = { value, raw: order, confidence: value === order ? "hoch" : "mittel",
      hint: value === order ? undefined : `Gelesen als „${order}“, korrigiert.` };
  }
  const batch = find(t, /Charge\s*[:.]?\s*([A-Z0-9][A-Z0-9-]{3,19})/i);
  if (batch) v.batch = { value: batch.toUpperCase(), confidence: "hoch" };

  const mat = find(t, /Material[\s-]*Nr\.?\s*[:.]?\s*([0-9OIlSB][0-9OIlSB\- ]{4,16}[0-9OIlSB])/i);
  if (mat) v.materialNo = { value: fixDigits(mat).replace(/\s+/g, ""), confidence: "hoch" };

  const line = find(t, /Linie\s*[:.]?\s*([0-9Il|]+)/i);
  if (line) {
    const n = fixDigits(line);
    const name = `Linie ${n}`;
    v.line = (LINES as readonly string[]).includes(name)
      ? { value: name, confidence: "hoch" }
      : { value: "", raw: line, confidence: "niedrig", hint: `Linie „${line}“ unbekannt (erlaubt 1–4).` };
  }
  const shift = find(t, /Schicht\s*[:.]?\s*([A-Za-zÄÖÜäöüß]+)/i);
  if (shift) {
    const hit = SHIFTS.find((s) => s.toLowerCase() === shift.toLowerCase());
    v.shift = hit ? { value: hit, confidence: "hoch" }
      : { value: "", raw: shift, confidence: "niedrig", hint: `Schicht „${shift}“ unbekannt.` };
  }
  const date = t.match(/Datum\s*[:.]?\s*(\d{1,2})\s*[./]\s*(\d{1,2})\s*[./]\s*(\d{4})/i);
  if (date) {
    const [, d = "", m = "", y = ""] = date;
    const iso = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    const ok = !Number.isNaN(Date.parse(iso)) && +m >= 1 && +m <= 12 && +d >= 1 && +d <= 31;
    v.date = ok ? { value: iso, confidence: "hoch" }
      : { value: "", raw: date[0], confidence: "niedrig", hint: "Datum nicht plausibel." };
  }
  if (Object.keys(v).length === 0)
    throw new ImportError("no_fields", "Im Dokument wurden keine bekannten Felder gefunden.");
  return { source, values: v };
}
