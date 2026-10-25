import { useState } from "react";
import type { ReportData } from "../lib/schema";
import { applySelection, previewRows, type PreviewRow } from "../lib/ocr/preview";
import type { ImportField } from "../lib/ocr/types";

const SAMPLE_URL = `${import.meta.env.BASE_URL}samples/beispiel-auftrag-scan.pdf`;

export function OcrImport({ current, onApply }: { current: ReportData; onApply: (d: ReportData) => void }) {
  const [status, setStatus] = useState<string | null>(null);
  const [rows, setRows] = useState<PreviewRow[] | null>(null);
  const [source, setSource] = useState("");
  const [sel, setSel] = useState<Set<ImportField>>(new Set());
  const [busy, setBusy] = useState(false);

  const run = async (file: File) => {
    setBusy(true); setRows(null); setStatus("PDF wird gelesen …");
    try {
      const { importPdf } = await import("../lib/ocr/pdf");
      const res = await importPdf(file, setStatus);
      const r = previewRows(res, current);
      setRows(r); setSource(res.source);
      setSel(new Set(r.filter((x) => x.preselected).map((x) => x.field)));
      setStatus(null);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : String(e));
    } finally { setBusy(false); }
  };
  const loadSample = async () => {
    const blob = await (await fetch(SAMPLE_URL)).blob();
    await run(new File([blob], "beispiel-auftrag-scan.pdf", { type: "application/pdf" }));
  };

  return (
    <fieldset className="ocr">
      <legend>Auftragsdaten aus PDF übernehmen</legend>
      <div className="toolbar">
        <label className="button">PDF wählen…
          <input type="file" accept="application/pdf,.pdf" hidden disabled={busy}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void run(f); e.target.value = ""; }} />
        </label>
        <button onClick={() => void loadSample()} disabled={busy}>Beispiel-Scan testen</button>
        <span className="muted">Verarbeitung lokal im Browser (tesseract.js, selbst gehostet).</span>
      </div>
      {status && <p className="info">{status}</p>}
      {rows && (
        <div className="preview">
          <p className="muted">Quelle: {source}</p>
          <table>
            <thead><tr><th /><th>Feld</th><th>Erkannt</th><th>Aktuell</th><th>Hinweis</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.field} className={r.next.confidence}>
                  <td><input type="checkbox" disabled={!r.selectable} checked={sel.has(r.field)}
                    onChange={(e) => setSel((s) => { const n = new Set(s); if (e.target.checked) n.add(r.field); else n.delete(r.field); return n; })} /></td>
                  <td>{r.label}</td>
                  <td><strong>{r.next.value || r.next.raw || "–"}</strong> <span className={`conf ${r.next.confidence}`}>{r.next.confidence}</span></td>
                  <td>{r.current || <span className="muted">leer</span>}{r.status === "abweichend" && " ⚠"}</td>
                  <td className="hint">{r.next.hint}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="toolbar">
            <button className="primary" onClick={() => { onApply(applySelection(current, rows, sel)); setRows(null); setStatus(`${sel.size} Feld(er) übernommen – bitte prüfen.`); }}>Auswahl übernehmen</button>
            <button onClick={() => setRows(null)}>Verwerfen</button>
          </div>
        </div>
      )}
    </fieldset>
  );
}
