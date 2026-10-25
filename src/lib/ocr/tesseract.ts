import { binarize, OCR_DPI, type Recognizer, type Rotation } from "./ocr";
import type { PdfPage } from "./pdf";

/** tesseract.js, lazy-loaded; all assets self-hosted under public/tesseract (no CDN). */
export async function createRecognizer(): Promise<Recognizer<HTMLCanvasElement>> {
  const { createWorker, OEM, PSM } = await import("tesseract.js");
  const base = new URL(`${import.meta.env.BASE_URL}tesseract/`, document.baseURI).href;
  let report: ((p: number) => void) | undefined;
  const worker = await createWorker("deu", OEM.LSTM_ONLY, {
    workerPath: `${base}worker.min.js`,
    corePath: `${base}core`,
    langPath: `${base}lang`,
    gzip: true,
    workerBlobURL: false,
    logger: (m: { status: string; progress: number }) => {
      if (m.status === "recognizing text") report?.(m.progress);
    },
  });
  await worker.setParameters({ tessedit_pageseg_mode: PSM.AUTO });
  return {
    async recognize(img, onProgress) {
      report = onProgress;
      try { return (await worker.recognize(img)).data.text; } finally { report = undefined; }
    },
    terminate: async () => { await worker.terminate(); },
  };
}

export async function renderPage(page: PdfPage, rotation: Rotation, dpi = OCR_DPI): Promise<HTMLCanvasElement> {
  if (!page.getViewport || !page.render) throw new Error("Seite nicht renderbar.");
  const viewport = page.getViewport({ scale: dpi / 72, rotation });
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas 2D nicht verfügbar.");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvas, canvasContext: ctx, viewport }).promise;
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  binarize(img.data);
  ctx.putImageData(img, 0, 0);
  return canvas;
}
