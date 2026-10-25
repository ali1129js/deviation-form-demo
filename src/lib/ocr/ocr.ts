import type { ImportResult, ImportValues } from "./types";

export const OCR_DPI = 200;
export const OCR_THRESHOLD = 180;
/** Clockwise rotations tried in order (scans are sometimes sideways). */
export const OCR_ROTATIONS = [0, 90, 270, 180] as const;
export type Rotation = (typeof OCR_ROTATIONS)[number];
export const OCR_HINT = "Per Texterkennung gelesen, bitte prüfen.";

export interface Recognizer<Img = unknown> {
  recognize(img: Img, onProgress?: (p: number) => void): Promise<string>;
  terminate(): Promise<void>;
}

/** Does the OCR text look like a correctly oriented order sheet? */
export const looksLikeOrder = (text: string) => /Auftrag|Charge/i.test(text);

/** Binarises RGBA pixel data in place. */
export function binarize(rgba: Uint8ClampedArray, threshold = OCR_THRESHOLD): void {
  for (let i = 0; i < rgba.length; i += 4) {
    const g = 0.299 * (rgba[i] ?? 0) + 0.587 * (rgba[i + 1] ?? 0) + 0.114 * (rgba[i + 2] ?? 0);
    rgba[i] = rgba[i + 1] = rgba[i + 2] = g < threshold ? 0 : 255;
  }
}

/** OCRs the page in each orientation until it looks like an order sheet. */
export async function ocrWithOrientation<Img>(
  render: (r: Rotation) => Promise<Img>,
  rec: Recognizer<Img>,
  onProgress?: (attempt: number, total: number, pct: number) => void,
): Promise<{ text: string; rotation: Rotation } | null> {
  for (const [i, rotation] of OCR_ROTATIONS.entries()) {
    const text = await rec.recognize(await render(rotation), (p) =>
      onProgress?.(i + 1, OCR_ROTATIONS.length, Math.round(p * 100)));
    if (looksLikeOrder(text)) return { text, rotation };
  }
  return null;
}

/** OCR values are never "hoch" and always carry the review hint. */
export function markAsOcr(r: ImportResult): ImportResult {
  const values: ImportValues = {};
  for (const [k, v] of Object.entries(r.values) as [keyof ImportValues, NonNullable<ImportValues[keyof ImportValues]>][])
    values[k] = { ...v, confidence: v.confidence === "hoch" ? "mittel" : v.confidence,
      hint: v.hint ? `${OCR_HINT} ${v.hint}` : OCR_HINT };
  return { source: `${r.source} (Texterkennung)`, values };
}
