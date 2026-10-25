import { z } from "zod";

export const LINES = ["Linie 1", "Linie 2", "Linie 3", "Linie 4"] as const;
export const SHIFTS = ["Früh", "Spät", "Nacht"] as const;
export const CATEGORIES = ["Maschine", "Material", "Prozess", "Dokumentation", "Sonstiges"] as const;

export const reportDataSchema = z.object({
  orderId: z.string().trim().default(""),
  batch: z.string().trim().default(""),
  materialNo: z.string().trim().default(""),
  line: z.enum(LINES).or(z.literal("")).default(""),
  shift: z.enum(SHIFTS).or(z.literal("")).default(""),
  date: z.string().default(""),
  category: z.enum(CATEGORIES).or(z.literal("")).default(""),
  description: z.string().default(""),
  measures: z.string().default(""),
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
  orderId: "Auftrag",
  batch: "Charge",
  materialNo: "Material-Nr.",
  line: "Linie",
  shift: "Schicht",
  date: "Datum",
  category: "Kategorie",
  description: "Beschreibung der Abweichung",
  measures: "Sofortmaßnahmen",
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
    p.push({ field: "orderId", message: "Auftrag: 6–10 Ziffern." });
  if (d.date && !/^\d{4}-\d{2}-\d{2}$/.test(d.date))
    p.push({ field: "date", message: "Datum im Format JJJJ-MM-TT." });
  if (d.description.trim() && d.description.trim().length < 10)
    p.push({ field: "description", message: "Beschreibung: mindestens 10 Zeichen." });
  return p;
}
