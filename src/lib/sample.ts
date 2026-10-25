import type { ReportData } from "./schema";

/** Obviously fictional demo records. */
export const SAMPLE_REPORTS: ReportData[] = [
  { orderId: "4711001", batch: "DEMO-0815", materialNo: "900-123-45", line: "Linie 2", shift: "Früh",
    date: "2026-03-12", category: "Maschine", description: "Etikettierer stoppt sporadisch (Beispieltext, fiktiv).",
    measures: "Sensor gereinigt, 20 Muster nachgeprüft.", reportedBy: "MM", shiftLead: "EM" },
  { orderId: "1234567", batch: "TEST-4242", materialNo: "900-000-01", line: "Linie 4", shift: "Nacht",
    date: "2026-03-14", category: "Dokumentation", description: "Unterschrift im Muster-Protokoll fehlte (fiktiv).",
    measures: "Nachgetragen.", reportedBy: "JD", shiftLead: "" },
];
