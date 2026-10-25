import { z } from "zod";

export const LINES = ["Linie 1", "Linie 2", "Linie 3", "Linie 4"] as const;
export const SHIFTS = ["Früh", "Spät", "Nacht"] as const;
export const UNITS = ["Stück", "Packungen", "Blister", "kg", "L"] as const;
export const CATEGORIES = ["Maschine", "Material", "Prozess", "Dokumentation", "Sonstiges"] as const;

export const reportDataSchema = z.object({
  orderId: z.string().trim().default(""),
  batch: z.string().trim().default(""),
  materialNo: z.string().trim().default(""),
  materialName: z.string().trim().default(""),
  quantity: z.string().trim().default(""),
  unit: z.enum(UNITS).or(z.literal("")).default(""),
  line: z.enum(LINES).or(z.literal("")).default(""),
  shift: z.enum(SHIFTS).or(z.literal("")).default(""),
  date: z.string().default(""),
  category: z.enum(CATEGORIES).or(z.literal("")).default(""),
  description: z.string().default(""),
  cause: z.string().default(""),
  measures: z.string().default(""),
  impact: z.string().default(""),
  correction: z.string().default(""),
  reportedBy: z.string().trim().default(""),
  shiftLead: z.string().trim().default(""),
});
export type ReportData = z.infer<typeof reportDataSchema>;
export type FieldName = keyof ReportData;

export const reportSchema = z.object({
  id: z.number().int().positive(),
  number: z.string().regex(/^DR-\d{4}-\d{4}$/),
  status: z.enum(["entwurf", "abgeschlossen"]),
  createdAt: z.string(),
  updatedAt: z.string(),
  data: reportDataSchema,
});
export type Report = z.infer<typeof reportSchema>;

export const emptyData = (): ReportData => reportDataSchema.parse({});

export const FIELD_LABEL: Record<FieldName, string> = {
  orderId: "Auftrags-ID",
  batch: "Charge",
  materialNo: "Material-Nr.",
  materialName: "Materialname",
  quantity: "Auftragsmenge",
  unit: "Einheit",
  line: "Linie",
  shift: "Schicht",
  date: "Datum",
  category: "Kategorie",
  description: "Beschreibung der Abweichung",
  cause: "Mögliche Ursache",
  measures: "Sofortmaßnahmen",
  impact: "Auswirkung / Bewertung",
  correction: "Korrekturmaßnahme",
  reportedBy: "Gemeldet von (Kürzel)",
  shiftLead: "Schichtleitung (Kürzel)",
};

const REQUIRED: FieldName[] = ["orderId", "batch", "line", "date", "category", "description", "reportedBy", "shiftLead"];

export interface Problem { field: FieldName; message: string }

/** Validation for completing a report (drafts may be incomplete). */
export function validateForCompletion(d: ReportData): Problem[] {
  const p: Problem[] = REQUIRED.filter((f) => !String(d[f]).trim()).map((field) => ({
    field,
    message: `${FIELD_LABEL[field]} ist ein Pflichtfeld.`,
  }));
  if (d.orderId && !/^\d{6,10}$/.test(d.orderId))
    p.push({ field: "orderId", message: "Auftrags-ID: 6–10 Ziffern." });
  if (d.quantity && !/^\d+([.,]\d+)?$/.test(d.quantity))
    p.push({ field: "quantity", message: "Auftragsmenge: nur Zahlen." });
  if (d.date && !/^\d{4}-\d{2}-\d{2}$/.test(d.date))
    p.push({ field: "date", message: "Datum im Format JJJJ-MM-TT." });
  if (d.description.trim() && d.description.trim().length < 10)
    p.push({ field: "description", message: "Beschreibung: mindestens 10 Zeichen." });
  return p;
}
