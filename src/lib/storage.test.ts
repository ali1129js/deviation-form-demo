import { MemoryStorage } from "./memoryStorage";
import { BACKUP_PREFIX, ReportRepository, STORAGE_KEY, StorageError, ValidationError } from "./storage";
import { SAMPLE_REPORTS } from "./sample";
import { emptyData } from "./schema";

const now = () => new Date("2026-03-12T10:00:00Z");
const mk = () => { const s = new MemoryStorage(); const r = new ReportRepository(s, now); r.load(); return { s, r }; };
const full = SAMPLE_REPORTS[0]!;

describe("ReportRepository", () => {
  it("starts empty", () => expect(mk().r.list()).toEqual([]));
  it("saves a draft with running number", () => {
    const { r } = mk();
    expect(r.save(null, emptyData()).number).toBe("DR-2026-0001");
    expect(r.save(null, emptyData()).number).toBe("DR-2026-0002");
  });
  it("persists across instances", () => {
    const { s, r } = mk();
    r.save(null, full);
    const r2 = new ReportRepository(s, now); r2.load();
    expect(r2.list()).toHaveLength(1);
  });
  it("rejects incomplete completion", () => {
    expect(() => mk().r.save(null, emptyData(), true)).toThrow(ValidationError);
  });
  it("completes a full report and locks it", () => {
    const { r } = mk();
    const rep = r.save(null, full, true);
    expect(rep.status).toBe("abgeschlossen");
    expect(() => r.save(rep.id, full)).toThrow(StorageError);
  });
  it("updates an existing draft", () => {
    const { r } = mk();
    const a = r.save(null, emptyData());
    r.save(a.id, { ...emptyData(), batch: "X-1" });
    expect(r.get(a.id)?.data.batch).toBe("X-1");
    expect(r.list()).toHaveLength(1);
  });
  it("backs up corrupt JSON and locks writes", () => {
    const s = new MemoryStorage(); s.setItem(STORAGE_KEY, "{oops");
    const r = new ReportRepository(s, now);
    const res = r.load();
    expect(res.ok).toBe(false);
    expect([...Array(s.length).keys()].some((i) => s.key(i)?.startsWith(BACKUP_PREFIX))).toBe(true);
    expect(() => r.save(null, emptyData())).toThrow(StorageError);
    r.reset(); expect(r.save(null, emptyData()).id).toBe(1);
  });
  it("detects schema mismatch", () => {
    const s = new MemoryStorage(); s.setItem(STORAGE_KEY, JSON.stringify({ version: 2 }));
    expect(new ReportRepository(s, now).load().ok).toBe(false);
  });
  it("keeps state when a write fails", () => {
    const { s, r } = mk(); s.failWrites = true;
    expect(() => r.save(null, emptyData())).toThrow(StorageError);
    expect(r.list()).toHaveLength(0);
  });
  it("export/import round trip", () => {
    const { r } = mk(); r.save(null, full); r.save(null, SAMPLE_REPORTS[1]!);
    const json = r.exportJson();
    const { r: r2 } = mk();
    expect(r2.importJson(json)).toBe(2);
    expect(r2.list().map((x) => x.number).sort()).toEqual(["DR-2026-0001", "DR-2026-0002"]);
  });
  it("rejects invalid backups without touching data", () => {
    const { r } = mk(); r.save(null, full);
    expect(() => r.importJson("nope")).toThrow(StorageError);
    expect(() => r.importJson(JSON.stringify({ version: 1, reports: "x" }))).toThrow(StorageError);
    expect(r.list()).toHaveLength(1);
  });
});
