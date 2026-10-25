import { markAsOcr, ocrWithOrientation, type Recognizer, type Rotation } from "./ocr";
import { parseOrderText } from "./parser";
import { ImportError, type ImportResult } from "./types";

export interface PdfPage {
  getTextContent(): Promise<{ items: unknown[] }>;
  getViewport?(p: { scale: number; rotation?: number }): { width: number; height: number };
  render?(p: { canvas: unknown; canvasContext: unknown; viewport: unknown }): { promise: Promise<unknown> };
}
export interface PdfDoc { numPages: number; getPage(n: number): Promise<PdfPage> }
export interface PdfJs { getDocument(src: { data: Uint8Array }): { promise: Promise<PdfDoc> } }

export interface OcrBackend<Img = unknown> {
  load(): Promise<Recognizer<Img>>;
  render(page: PdfPage, rotation: Rotation): Promise<Img>;
}

async function loadPdfJs(): Promise<PdfJs> {
  const [pdfjs, worker] = await Promise.all([
    import("pdfjs-dist"),
    import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
  ]);
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  return pdfjs as unknown as PdfJs;
}

const browserOcr: OcrBackend = {
  load: async () => (await import("./tesseract")).createRecognizer() as Promise<Recognizer>,
  render: async (p, r) => (await import("./tesseract")).renderPage(p, r),
};

export async function textFromDoc(doc: PdfDoc): Promise<string> {
  const out: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const tc = await (await doc.getPage(i)).getTextContent();
    out.push(tc.items.map((it) => (it && typeof it === "object" && "str" in it ? String((it as { str: string }).str) : "")).join("\n"));
  }
  return out.join("\n");
}

export const MAX_SIZE = 20 * 1024 * 1024;

/** Reads a PDF: text layer if present, otherwise OCR of page 1 (lazy-loaded tesseract.js). */
export async function importPdf(
  file: File,
  onStatus?: (s: string) => void,
  pdfjsLoad: () => Promise<PdfJs> = loadPdfJs,
  ocr: OcrBackend = browserOcr,
): Promise<ImportResult> {
  if (!(file.type === "application/pdf" || /\.pdf$/i.test(file.name)))
    throw new ImportError("not_pdf", `„${file.name}“ ist keine PDF-Datei.`);
  if (file.size > MAX_SIZE) throw new ImportError("not_pdf", "PDF zu groß (max. 20 MB).");
  let doc: PdfDoc;
  try { doc = await (await pdfjsLoad()).getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise; }
  catch (e) { throw new ImportError("unreadable", `PDF nicht lesbar (${e instanceof Error ? e.message : String(e)}).`); }
  const source = `PDF „${file.name}“`;
  const text = await textFromDoc(doc);
  if (text.replace(/\s/g, "").length >= 20) return parseOrderText(text, source);

  onStatus?.("Texterkennung wird geladen …");
  const rec = await ocr.load();
  try {
    const page = await doc.getPage(1);
    const res = await ocrWithOrientation((r) => ocr.render(page, r), rec,
      (a, n, p) => onStatus?.(`Texterkennung (Versuch ${a}/${n}): ${p} %`));
    if (!res) throw new ImportError("no_text", "Texterkennung hat keinen Auftrag erkannt. Bitte manuell eintragen.");
    return markAsOcr(parseOrderText(res.text, source));
  } finally {
    await rec.terminate();
  }
}
