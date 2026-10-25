import type { ReportData } from "./schema";

/** Obviously fictional demo records (Musterwerk / Musterprodukt). */
export const SAMPLE_REPORTS: ReportData[] = [
  { orderId: "100045821", batch: "MW26A0417", materialNo: "8812345", materialName: "Musterprodukt 20 mg Filmtabletten (fiktiv)",
    quantity: "120000", unit: "Stück", line: "Linie 2", shift: "Früh", date: "2026-03-12", category: "Maschine",
    description: "Am 12.03. um ca. 07:40 Uhr Maschinenstillstand wegen Folienriss an der Siegelstation, Linie 2. Ca. 350 Blister betroffen.",
    cause: "Folienrolle vermutlich beschädigt angeliefert.",
    measures: "Produkt gesperrt und gekennzeichnet. Instandhaltung informiert.",
    impact: "Betroffene Blister aussortiert, keine Auswirkung auf freigegebene Ware.",
    correction: "Wareneingangskontrolle der Folienrollen erweitern.",
    reportedBy: "MM", shiftLead: "EM" },
  { orderId: "100045907", batch: "MW26B0122", materialNo: "8812399", materialName: "Beispielsaft 100 ml (fiktiv)",
    quantity: "4800", unit: "Packungen", line: "Linie 4", shift: "Nacht", date: "2026-03-14", category: "Prozess",
    description: "IPC außerhalb Toleranz: Füllgewicht bei 3 von 20 Mustern zu niedrig (fiktive Werte).",
    cause: "", measures: "Linie angehalten. Schichtleitung informiert.", impact: "", correction: "",
    reportedBy: "JD", shiftLead: "" },
];
