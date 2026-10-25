import { emptyData, validateForCompletion } from "./schema";
import { SAMPLE_REPORTS } from "./sample";
import { formatDate, printRows } from "./print";

describe("validation", () => {
  it("lists all required fields for empty data", () => {
    expect(validateForCompletion(emptyData()).map((p) => p.field)).toEqual(
      ["orderId", "batch", "line", "date", "category", "description", "reportedBy", "shiftLead"]);
  });
  it("accepts a complete sample", () => expect(validateForCompletion(SAMPLE_REPORTS[0]!)).toEqual([]));
  it("checks order id format", () => {
    expect(validateForCompletion({ ...SAMPLE_REPORTS[0]!, orderId: "12a" }).some((p) => p.field === "orderId")).toBe(true);
  });
  it("checks description length", () => {
    expect(validateForCompletion({ ...SAMPLE_REPORTS[0]!, description: "kurz" })[0]?.field).toBe("description");
  });
});

describe("print", () => {
  it("prints quantity with unit", () => {
    const r = { id: 1, number: "DR-2026-0001", status: "entwurf" as const, createdAt: "", updatedAt: "", data: SAMPLE_REPORTS[0]! };
    expect(printRows(r).find((x) => x.label === "Auftragsmenge")?.value).toBe("120000 Stück");
  });
  it("formats dates", () => expect(formatDate("2026-03-12")).toBe("12.03.2026"));
  it("renders blanks for empty fields", () => {
    const rows = printRows({ id: 1, number: "DR-2026-0001", status: "entwurf", createdAt: "", updatedAt: "", data: emptyData() });
    expect(rows.every((r) => r.value.startsWith("___"))).toBe(true);
    expect(rows).toHaveLength(16);
  });
});
