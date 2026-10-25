import type { FieldName } from "./schema";

export type TextField = "description" | "cause" | "measures" | "impact" | "correction";
export const TEXT_FIELDS: readonly TextField[] = ["description", "cause", "measures", "impact", "correction"];
export const isTextField = (f: FieldName): f is TextField => (TEXT_FIELDS as readonly string[]).includes(f);

/** Placeholder with a structure hint per free-text field. */
export const TEXT_PLACEHOLDER: Record<TextField, string> = {
  description: "Was ist passiert? Wann (Datum/Uhrzeit)? Wo (Linie/Station)? Wie viel ist betroffen?\nz. B. „Um 07:40 Uhr Folienriss an der Siegelstation, ca. 350 Blister betroffen.“",
  cause: "Was ist die vermutete Ursache? Was wurde geprüft?\nz. B. „Folienrolle vermutlich beschädigt angeliefert.“",
  measures: "Was wurde sofort getan? Wer wurde informiert?\nz. B. „Produkt gesperrt und gekennzeichnet, Instandhaltung informiert.“",
  impact: "Welche Menge/Charge ist betroffen? Risiko für Qualität oder Lieferung?\nz. B. „Ca. 350 Einheiten aussortiert, keine Auswirkung auf freigegebene Ware.“",
  correction: "Was verhindert eine Wiederholung? Wer, bis wann?\nz. B. „Wareneingangskontrolle erweitern (Verantwortlich: EM, bis 31.03.)“",
};

/** Typical (generic) phrases; "…" marks a gap that is selected after insertion. */
export const SUGGESTIONS: Record<TextField, readonly string[]> = {
  description: [
    "Maschinenstillstand wegen …",
    "Folienriss an der Siegelstation",
    "IPC außerhalb Toleranz",
    "Fehlende oder unleserliche Bedruckung",
    "Falsches Packmittel bereitgestellt",
    "Zählerdifferenz zwischen Soll- und Ist-Menge",
    "Fremdkörper im Produktbereich gefunden",
    "Ca. … Einheiten betroffen",
  ],
  cause: [
    "Ursache noch unklar, Analyse läuft",
    "Verschleißteil defekt",
    "Formatteil falsch eingestellt",
    "Packmittel fehlerhaft angeliefert",
    "Bedienfehler beim Formatwechsel",
    "Sensor verschmutzt",
  ],
  measures: [
    "Linie angehalten",
    "Produkt gesperrt und gekennzeichnet",
    "Instandhaltung informiert",
    "Schichtleitung informiert",
    "Qualitätssicherung informiert",
    "Betroffene Einheiten aussortiert",
    "Linienräumung durchgeführt",
  ],
  impact: [
    "Keine Auswirkung auf die Produktqualität",
    "Betroffene Menge: … Einheiten",
    "Charge bis zur Bewertung gesperrt",
    "Lieferverzug möglich",
    "100 %-Kontrolle der betroffenen Menge erforderlich",
  ],
  correction: [
    "Wartungsintervall anpassen",
    "Mitarbeitende nachschulen",
    "Arbeitsanweisung aktualisieren",
    "Wareneingangskontrolle erweitern",
    "Verantwortlich: …, Termin: …",
  ],
};

export interface InsertResult { text: string; selStart: number; selEnd: number }

/**
 * Appends a phrase to the existing text (never replaces it). Separates with ". " unless
 * the text already ends with punctuation or a newline. Returns the selection: the first
 * "…" gap if present (so the user can type over it), otherwise the caret at the end.
 */
export function insertPhrase(current: string, phrase: string): InsertResult {
  const base = current.replace(/[ \t]+$/, "");
  let sep = "";
  if (base && !/\n$/.test(base)) sep = /[.!?:;]$/.test(base) ? " " : ". ";
  const start = base.length + sep.length;
  const text = base + sep + phrase;
  const gap = phrase.indexOf("…");
  return gap >= 0
    ? { text, selStart: start + gap, selEnd: start + gap + 1 }
    : { text, selStart: text.length, selEnd: text.length };
}
