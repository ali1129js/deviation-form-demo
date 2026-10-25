import { z } from "zod";
import { reportDataSchema, reportSchema, validateForCompletion, type Problem, type Report, type ReportData } from "./schema";

export const STORAGE_KEY = "deviation-form-demo:v1";
export const BACKUP_PREFIX = `${STORAGE_KEY}:corrupt:`;

export const dbSchema = z.object({
  version: z.literal(1),
  counter: z.record(z.string().regex(/^\d{4}$/), z.number().int().nonnegative()),
  reports: z.array(reportSchema),
});
export type Db = z.infer<typeof dbSchema>;
export const emptyDb = (): Db => ({ version: 1, counter: {}, reports: [] });

export class ValidationError extends Error {
  constructor(readonly problems: Problem[]) { super("Bericht unvollständig"); this.name = "ValidationError"; }
}
export class StorageError extends Error {
  constructor(message: string) { super(message); this.name = "StorageError"; }
}

export type LoadResult = { ok: true } | { ok: false; message: string; backupKey: string | null };

/**
 * localStorage repository. Corrupt data is copied to a backup key and the store is
 * locked for writing until `reset()` is called — never silently overwritten.
 */
export class ReportRepository {
  private db: Db = emptyDb();
  locked = false;
  constructor(private readonly storage: Storage, private readonly now: () => Date = () => new Date()) {}

  load(): LoadResult {
    const raw = this.storage.getItem(STORAGE_KEY);
    if (raw === null) { this.db = emptyDb(); this.locked = false; return { ok: true }; }
    let json: unknown;
    try { json = JSON.parse(raw); } catch { return this.fail(raw, "Gespeicherte Daten sind kein gültiges JSON."); }
    const res = dbSchema.safeParse(json);
    if (!res.success) return this.fail(raw, "Gespeicherte Daten haben ein unerwartetes Format.");
    this.db = res.data; this.locked = false;
    return { ok: true };
  }

  list(): Report[] {
    return structuredClone(this.db.reports).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }
  get(id: number): Report | null {
    const r = this.db.reports.find((x) => x.id === id);
    return r ? structuredClone(r) : null;
  }

  save(id: number | null, data: ReportData, complete = false): Report {
    if (this.locked) throw new StorageError("Speichern gesperrt: vorhandene Daten sind beschädigt.");
    const parsed = reportDataSchema.parse(data);
    if (complete) {
      const problems = validateForCompletion(parsed);
      if (problems.length) throw new ValidationError(problems);
    }
    const next = structuredClone(this.db);
    const ts = this.now().toISOString();
    let r = id != null ? next.reports.find((x) => x.id === id) : undefined;
    if (id != null && !r) throw new StorageError(`Bericht ${id} nicht gefunden.`);
    if (r?.status === "abgeschlossen") throw new StorageError(`${r.number} ist bereits abgeschlossen.`);
    if (!r) {
      const year = String(this.now().getFullYear());
      const n = (next.counter[year] ?? 0) + 1;
      next.counter[year] = n;
      r = {
        id: next.reports.reduce((m, x) => Math.max(m, x.id), 0) + 1,
        number: `DR-${year}-${String(n).padStart(4, "0")}`,
        status: "entwurf", createdAt: ts, updatedAt: ts, data: parsed,
      };
      next.reports.push(r);
    }
    r.data = parsed;
    r.updatedAt = ts;
    if (complete) r.status = "abgeschlossen";
    this.write(next);
    this.db = next;
    return structuredClone(r);
  }

  /** Full backup as JSON string. */
  exportJson(): string {
    return JSON.stringify({ ...this.db, exportedAt: this.now().toISOString() }, null, 2);
  }

  /** Replaces the store with a validated backup. Throws on invalid input; state unchanged. */
  importJson(text: string): number {
    let json: unknown;
    try { json = JSON.parse(text); } catch { throw new StorageError("Backup ist kein gültiges JSON."); }
    const res = dbSchema.safeParse(json);
    if (!res.success) throw new StorageError("Backup hat ein unerwartetes Format.");
    this.write(res.data);
    this.db = res.data; this.locked = false;
    return res.data.reports.length;
  }

  reset(): void { const e = emptyDb(); this.write(e); this.db = e; this.locked = false; }

  private write(db: Db) {
    try { this.storage.setItem(STORAGE_KEY, JSON.stringify(db)); }
    catch (e) { throw new StorageError(`Speichern fehlgeschlagen (${e instanceof Error ? e.message : String(e)}).`); }
  }
  private fail(raw: string, message: string): LoadResult {
    let backupKey: string | null = `${BACKUP_PREFIX}${this.now().toISOString().replace(/[:.]/g, "-")}`;
    try { this.storage.setItem(backupKey, raw); } catch { backupKey = null; }
    this.db = emptyDb(); this.locked = true;
    return { ok: false, message, backupKey };
  }
}
