import { parseOrderText, fixDigits } from "./parser";
import { binarize, markAsOcr, ocrWithOrientation, OCR_HINT, type Recognizer } from "./ocr";
import { applySelection, previewRows } from "./preview";
import { importPdf, type PdfJs, type OcrBackend } from "./pdf";
import { ImportError } from "./types";
import { emptyData } from "../schema";

const SAMPLE = `MUSTERWERK GMBH (FIKTIV)
Auftrag: 4711002
Charge: DEMO-1234
Material-Nr.: 900-555-77
Linie: 3
Schicht: Spät
Datum: 18.03.2026`;

describe("parser", () => {
  it("parses all fields", () => {
    const r = parseOrderText(SAMPLE, "t");
    expect(Object.fromEntries(Object.entries(r.values).map(([k, v]) => [k, v.value]))).toEqual({
      orderId: "4711002", batch: "DEMO-1234", materialNo: "900-555-77", line: "Linie 3", shift: "Spät", date: "2026-03-18",
    });
  });
  it("fixes OCR digit confusions", () => {
    expect(fixDigits("47l1OO2")).toBe("4711002");
    const r = parseOrderText("Auftrag: 47l1OO2", "t");
    expect(r.values.orderId).toMatchObject({ value: "4711002", confidence: "mittel" });
  });
  it("flags unknown line", () => {
    expect(parseOrderText("Linie: 7", "t").values.line).toMatchObject({ value: "", confidence: "niedrig" });
  });
  it("flags implausible date", () => {
    expect(parseOrderText("Datum: 41.13.2026", "t").values.date?.confidence).toBe("niedrig");
  });
  it("throws when nothing is found", () => {
    expect(() => parseOrderText("Hallo Welt", "t")).toThrow(ImportError);
  });
});

describe("ocr helpers", () => {
  it("binarizes", () => {
    const px = new Uint8ClampedArray([10, 10, 10, 255, 240, 240, 240, 255]);
    binarize(px);
    expect([...px]).toEqual([0, 0, 0, 255, 255, 255, 255, 255]);
  });
  it("tries orientations until it matches", async () => {
    const seen: number[] = [];
    const rec: Recognizer<number> = {
      recognize: async (rot) => { seen.push(rot); return rot === 270 ? SAMPLE : "xx"; },
      terminate: async () => {},
    };
    const r = await ocrWithOrientation(async (rot) => rot, rec);
    expect(r?.rotation).toBe(270);
    expect(seen).toEqual([0, 90, 270]);
  });
  it("returns null when nothing matches", async () => {
    const rec: Recognizer<number> = { recognize: async () => "", terminate: async () => {} };
    expect(await ocrWithOrientation(async (r) => r, rec)).toBeNull();
  });
  it("marks OCR values for review", () => {
    const r = markAsOcr(parseOrderText(SAMPLE, "t"));
    expect(Object.values(r.values).every((v) => v.confidence !== "hoch" && v.hint?.startsWith(OCR_HINT))).toBe(true);
  });
});

describe("preview", () => {
  const res = parseOrderText(SAMPLE, "t");
  it("preselects only empty fields", () => {
    const rows = previewRows(res, { ...emptyData(), batch: "OTHER", orderId: "4711002" });
    const by = Object.fromEntries(rows.map((r) => [r.field, r]));
    expect(by.orderId?.status).toBe("gleich");
    expect(by.orderId?.selectable).toBe(false);
    expect(by.batch?.status).toBe("abweichend");
    expect(by.batch?.preselected).toBe(false);
    expect(by.line?.preselected).toBe(true);
  });
  it("applies only selected rows", () => {
    const rows = previewRows(res, emptyData());
    const out = applySelection(emptyData(), rows, new Set(["batch", "line"]));
    expect(out.batch).toBe("DEMO-1234");
    expect(out.line).toBe("Linie 3");
    expect(out.orderId).toBe("");
  });
});

describe("importPdf", () => {
  const file = (name = "a.pdf") => new File([new Uint8Array([1, 2])], name, { type: "application/pdf" });
  const pdfjs = (text: string): PdfJs => ({
    getDocument: () => ({ promise: Promise.resolve({ numPages: 1, getPage: async () => ({
      getTextContent: async () => ({ items: text.split("\n").map((str) => ({ str })) }) }) }) }),
  });
  const noOcr: OcrBackend = { load: () => { throw new Error("should not load"); }, render: async () => null };

  it("rejects non-PDF", async () => {
    await expect(importPdf(new File(["x"], "a.txt"), undefined, async () => pdfjs(""), noOcr)).rejects.toThrow(ImportError);
  });
  it("uses the text layer without OCR", async () => {
    const r = await importPdf(file(), undefined, async () => pdfjs(SAMPLE), noOcr);
    expect(r.values.batch?.confidence).toBe("hoch");
  });
  it("falls back to OCR for image-only PDFs and terminates the worker", async () => {
    let terminated = false;
    const ocr: OcrBackend<number> = {
      load: async () => ({ recognize: async () => SAMPLE, terminate: async () => { terminated = true; } }),
      render: async (_p, r) => r,
    };
    const r = await importPdf(file(), undefined, async () => pdfjs(""), ocr as OcrBackend);
    expect(r.source).toContain("Texterkennung");
    expect(r.values.orderId?.hint).toContain("bitte prüfen");
    expect(terminated).toBe(true);
  });
  it("reports unreadable PDFs", async () => {
    const bad: PdfJs = { getDocument: () => ({ promise: Promise.reject(new Error("broken")) }) };
    await expect(importPdf(file(), undefined, async () => bad, noOcr)).rejects.toMatchObject({ kind: "unreadable" });
  });
});
