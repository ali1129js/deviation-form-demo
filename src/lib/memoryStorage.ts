/** Minimal in-memory Storage (tests). */
export class MemoryStorage implements Storage {
  private m = new Map<string, string>();
  failWrites = false;
  get length() { return this.m.size; }
  clear() { this.m.clear(); }
  getItem(k: string) { return this.m.get(k) ?? null; }
  key(i: number) { return [...this.m.keys()][i] ?? null; }
  removeItem(k: string) { this.m.delete(k); }
  setItem(k: string, v: string) { if (this.failWrites) throw new Error("QuotaExceeded"); this.m.set(k, v); }
}
