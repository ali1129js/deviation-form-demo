import { insertPhrase, SUGGESTIONS, TEXT_FIELDS, TEXT_PLACEHOLDER } from "./suggestions";

describe("insertPhrase", () => {
  it("inserts into empty text", () => {
    expect(insertPhrase("", "Linie angehalten")).toEqual({ text: "Linie angehalten", selStart: 16, selEnd: 16 });
  });
  it("appends with '. ' after plain text", () => {
    expect(insertPhrase("Linie angehalten", "Instandhaltung informiert").text).toBe("Linie angehalten. Instandhaltung informiert");
  });
  it("appends with a space after punctuation", () => {
    expect(insertPhrase("Linie angehalten.", "Produkt gesperrt").text).toBe("Linie angehalten. Produkt gesperrt");
  });
  it("trims trailing spaces before appending", () => {
    expect(insertPhrase("Text.   ", "X").text).toBe("Text. X");
  });
  it("appends directly after a newline", () => {
    expect(insertPhrase("Zeile\n", "X").text).toBe("Zeile\nX");
  });
  it("never removes existing text", () => {
    const r = insertPhrase("Vorhanden", "Neu");
    expect(r.text.startsWith("Vorhanden")).toBe(true);
  });
  it("selects the … gap for editing", () => {
    const r = insertPhrase("Start.", "Maschinenstillstand wegen …");
    expect(r.text).toBe("Start. Maschinenstillstand wegen …");
    expect(r.text.slice(r.selStart, r.selEnd)).toBe("…");
  });
  it("has placeholders with a structure hint and phrases for every field", () => {
    for (const f of TEXT_FIELDS) {
      expect(SUGGESTIONS[f].length).toBeGreaterThan(3);
      expect(TEXT_PLACEHOLDER[f]).toMatch(/z\. B\./);
    }
    expect(TEXT_PLACEHOLDER.description).toMatch(/Was.*Wann.*Wo.*Wie viel/);
  });
});
