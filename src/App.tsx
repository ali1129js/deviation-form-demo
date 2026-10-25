import { useEffect, useMemo, useState } from "react";
import { ReportRepository, StorageError, ValidationError } from "./lib/storage";
import { CATEGORIES, emptyData, FIELD_LABEL, LINES, SHIFTS, type FieldName, type Report, type ReportData } from "./lib/schema";
import { SAMPLE_REPORTS } from "./lib/sample";
import { formatDate, printRows } from "./lib/print";
import { OcrImport } from "./components/OcrImport";

type Route = { view: "list" } | { view: "edit"; id: number | null } | { view: "print"; id: number };
const parseHash = (): Route => {
  const h = location.hash.replace(/^#\/?/, "");
  const [a, b] = h.split("/");
  if (a === "neu") return { view: "edit", id: null };
  if (a === "bericht" && b) return { view: "edit", id: Number(b) };
  if (a === "druck" && b) return { view: "print", id: Number(b) };
  return { view: "list" };
};
const go = (h: string) => { location.hash = h; };

export function App() {
  const repo = useMemo(() => new ReportRepository(window.localStorage), []);
  const [loadMsg, setLoadMsg] = useState<string | null>(() => {
    const r = repo.load();
    return r.ok ? null : `${r.message} Sicherung: ${r.backupKey ?? "fehlgeschlagen"}`;
  });
  const [route, setRoute] = useState<Route>(parseHash);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const f = () => setRoute(parseHash());
    window.addEventListener("hashchange", f);
    return () => window.removeEventListener("hashchange", f);
  }, []);
  const refresh = () => setTick((t) => t + 1);

  return (
    <div className="app">
      <header className="no-print">
        <a href="#/" className="brand">Abweichungsbericht <span className="tag">Demo</span></a>
        <span className="muted">Fiktive Daten · nur im Browser gespeichert</span>
      </header>
      {loadMsg && (
        <div className="alert no-print">
          {loadMsg}{" "}
          <button onClick={() => { repo.reset(); setLoadMsg(null); refresh(); }}>Neu beginnen</button>
        </div>
      )}
      <main key={tick}>
        {route.view === "list" && <ListView repo={repo} onChange={refresh} />}
        {route.view === "edit" && <Editor key={String(route.id)} repo={repo} id={route.id} />}
        {route.view === "print" && <PrintView report={repo.get(route.id)} />}
      </main>
      <footer className="no-print muted">Demo-Anwendung, KI-unterstützt erstellt. Alle Daten sind frei erfunden.</footer>
    </div>
  );
}

function ListView({ repo, onChange }: { repo: ReportRepository; onChange: () => void }) {
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const all = repo.list();
  const list = all.filter((r) => `${r.number} ${r.data.orderId} ${r.data.batch} ${r.data.line}`.toLowerCase().includes(q.toLowerCase()));

  const exportBackup = () => {
    const blob = new Blob([repo.exportJson()], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `abweichungen-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const importBackup = async (f: File | undefined) => {
    if (!f) return;
    if (!confirm("Backup importieren? Alle aktuellen Berichte werden ersetzt.")) return;
    try { setMsg(`${repo.importJson(await f.text())} Berichte importiert.`); onChange(); }
    catch (e) { setMsg(e instanceof Error ? e.message : String(e)); }
  };
  const seed = () => {
    try { SAMPLE_REPORTS.forEach((d, i) => repo.save(null, d, i === 0)); onChange(); }
    catch (e) { setMsg(e instanceof Error ? e.message : String(e)); }
  };

  return (
    <section>
      <div className="toolbar">
        <h1>Übersicht</h1>
        <button className="primary" onClick={() => go("/neu")}>+ Neuer Bericht</button>
      </div>
      <div className="toolbar">
        <input placeholder="Suche (Nr., Auftrag, Charge, Linie)" value={q} onChange={(e) => setQ(e.target.value)} />
        <button onClick={exportBackup}>Backup exportieren</button>
        <label className="button">Backup importieren
          <input type="file" accept="application/json,.json" hidden onChange={(e) => importBackup(e.target.files?.[0])} />
        </label>
        {all.length === 0 && <button onClick={seed}>Demo-Daten laden</button>}
      </div>
      {msg && <p className="info">{msg}</p>}
      {list.length === 0 ? <p className="muted">Keine Berichte.</p> : (
        <table>
          <thead><tr><th>Nr.</th><th>Status</th><th>Auftrag</th><th>Charge</th><th>Linie</th><th>Datum</th><th /></tr></thead>
          <tbody>
            {list.map((r) => (
              <tr key={r.id}>
                <td><a href={`#/bericht/${r.id}`}>{r.number}</a></td>
                <td><span className={`badge ${r.status}`}>{r.status === "entwurf" ? "Entwurf" : "Abgeschlossen"}</span></td>
                <td>{r.data.orderId}</td><td>{r.data.batch}</td><td>{r.data.line}</td><td>{formatDate(r.data.date)}</td>
                <td><a href={`#/druck/${r.id}`}>Drucken</a></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

function Editor({ repo, id }: { repo: ReportRepository; id: number | null }) {
  const existing: Report | null = id != null ? repo.get(id) : null;
  const [data, setData] = useState<ReportData>(existing?.data ?? emptyData());
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [msg, setMsg] = useState<string | null>(null);
  const readOnly = existing?.status === "abgeschlossen";
  if (id != null && !existing) return <p>Bericht nicht gefunden. <a href="#/">Zur Übersicht</a></p>;

  const set = (f: FieldName) => (e: { target: { value: string } }) => setData((d) => ({ ...d, [f]: e.target.value }));
  const save = (complete: boolean) => {
    try {
      const r = repo.save(id, data, complete);
      setErrors({});
      go(complete ? `/druck/${r.id}` : `/bericht/${r.id}`);
      setMsg(complete ? null : `Entwurf ${r.number} gespeichert.`);
    } catch (e) {
      if (e instanceof ValidationError) {
        setErrors(Object.fromEntries(e.problems.map((p) => [p.field, p.message])));
        setMsg("Bitte Pflichtfelder prüfen.");
      } else setMsg(e instanceof StorageError || e instanceof Error ? e.message : String(e));
    }
  };
  const field = (f: FieldName, el: React.ReactNode) => (
    <label className={`field ${f === "description" || f === "measures" ? "wide" : ""}`}>
      <span>{FIELD_LABEL[f]}</span>{el}{errors[f] && <em className="err">{errors[f]}</em>}
    </label>
  );
  const text = (f: FieldName, extra: React.InputHTMLAttributes<HTMLInputElement> = {}) =>
    field(f, <input value={data[f]} onChange={set(f)} disabled={readOnly} {...extra} />);
  const select = (f: FieldName, opts: readonly string[]) =>
    field(f, <select value={data[f]} onChange={set(f)} disabled={readOnly}><option value="">– bitte wählen –</option>{opts.map((o) => <option key={o}>{o}</option>)}</select>);
  const area = (f: FieldName) => field(f, <textarea rows={4} value={data[f]} onChange={set(f)} disabled={readOnly} />);

  return (
    <section>
      <div className="toolbar">
        <h1>{existing ? existing.number : "Neuer Abweichungsbericht"}</h1>
        {existing && <a href={`#/druck/${existing.id}`}>Druckansicht</a>}
      </div>
      {!readOnly && <OcrImport current={data} onApply={setData} />}
      <fieldset><legend>Auftragsdaten</legend>
        <div className="grid">
          {text("orderId", { inputMode: "numeric", placeholder: "z. B. 4711001" })}
          {text("batch", { placeholder: "z. B. DEMO-0815" })}
          {text("materialNo")}
          {select("line", LINES)}{select("shift", SHIFTS)}
          {text("date", { type: "date" })}
        </div>
      </fieldset>
      <fieldset><legend>Abweichung</legend>
        <div className="grid">{select("category", CATEGORIES)}{area("description")}{area("measures")}</div>
      </fieldset>
      <fieldset><legend>Freigabe</legend>
        <div className="grid">{text("reportedBy")}{text("shiftLead")}</div>
      </fieldset>
      {msg && <p className="info">{msg}</p>}
      {!readOnly && (
        <div className="toolbar">
          <button onClick={() => save(false)}>Entwurf speichern</button>
          <button className="primary" onClick={() => save(true)}>Abschließen</button>
        </div>
      )}
    </section>
  );
}

function PrintView({ report }: { report: Report | null }) {
  if (!report) return <p>Bericht nicht gefunden.</p>;
  return (
    <section className="print">
      <div className="toolbar no-print">
        <a href="#/">← Übersicht</a>
        <button className="primary" onClick={() => window.print()}>Drucken</button>
      </div>
      <h1>Abweichungsbericht {report.number}</h1>
      <p className="muted">Status: {report.status === "entwurf" ? "Entwurf" : "Abgeschlossen"} · Demo – fiktive Daten</p>
      <table className="print-table"><tbody>
        {printRows(report).map((r) => <tr key={r.label}><th>{r.label}</th><td>{r.value}</td></tr>)}
      </tbody></table>
      <div className="signatures"><div>Gemeldet von</div><div>Schichtleitung</div></div>
    </section>
  );
}
