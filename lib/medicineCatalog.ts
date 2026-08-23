export interface MedicineCatalogItem {
  id: string;
  name: string;
  strength: string;
  form: string;
}

export const MEDICINE_CATALOG: MedicineCatalogItem[] = [
  { id: "med_1", name: "Paracetamol", strength: "500 mg", form: "Tablet" },
  { id: "med_2", name: "Paracetamol", strength: "650 mg", form: "Tablet" },
  { id: "med_3", name: "Crocin", strength: "650 mg", form: "Tablet" },
  { id: "med_4", name: "Dolo", strength: "650 mg", form: "Tablet" },
  { id: "med_5", name: "Amoxicillin", strength: "500 mg", form: "Capsule" },
  { id: "med_6", name: "Amoxicillin", strength: "250 mg", form: "Capsule" },
  { id: "med_7", name: "Metformin", strength: "500 mg", form: "Tablet" },
  { id: "med_8", name: "Metformin", strength: "850 mg", form: "Tablet" },
  { id: "med_9", name: "Amlodipine", strength: "5 mg", form: "Tablet" },
  { id: "med_10", name: "Amlodipine", strength: "10 mg", form: "Tablet" },
  { id: "med_11", name: "Cetirizine", strength: "10 mg", form: "Tablet" },
  { id: "med_12", name: "Pantoprazole", strength: "40 mg", form: "Tablet" },
  { id: "med_13", name: "Omeprazole", strength: "20 mg", form: "Capsule" },
  { id: "med_14", name: "Ibuprofen", strength: "400 mg", form: "Tablet" },
  { id: "med_15", name: "Combiflam", strength: "400 mg", form: "Tablet" },
  { id: "med_16", name: "Azithromycin", strength: "500 mg", form: "Tablet" },
  { id: "med_17", name: "Telmisartan", strength: "40 mg", form: "Tablet" },
  { id: "med_18", name: "Atorvastatin", strength: "10 mg", form: "Tablet" },
  { id: "med_19", name: "Montelukast", strength: "10 mg", form: "Tablet" },
  { id: "med_20", name: "Aspirin", strength: "75 mg", form: "Tablet" },
  { id: "med_21", name: "Ranitidine", strength: "150 mg", form: "Tablet" },
  { id: "med_22", name: "Ciprofloxacin", strength: "500 mg", form: "Tablet" },
  { id: "med_23", name: "Levothyroxine", strength: "50 mcg", form: "Tablet" },
  { id: "med_24", name: "Losartan", strength: "50 mg", form: "Tablet" },
  { id: "med_25", name: "Glimepiride", strength: "1 mg", form: "Tablet" },
  { id: "med_26", name: "ORS (Oral Rehydration)", strength: "21.8 g", form: "Sachet" },
  { id: "med_27", name: "Cough Syrup", strength: "100 ml", form: "Syrup" },
  { id: "med_28", name: "Vitamin C", strength: "500 mg", form: "Tablet" },
  { id: "med_29", name: "Multivitamin", strength: "Daily", form: "Capsule" },
  { id: "med_30", name: "Inhaler (Salbutamol)", strength: "100 mcg", form: "Inhaler" }
];

/**
 * Searches the catalog with prefix matching first, then contains matching.
 * Returns up to maxResults (default 8).
 */
export function searchMedicineCatalog(query: string, maxResults: number = 8): MedicineCatalogItem[] {
  const norm = query.toLowerCase().trim();
  if (!norm) return [];

  const prefixMatches: MedicineCatalogItem[] = [];
  const containsMatches: MedicineCatalogItem[] = [];

  for (const item of MEDICINE_CATALOG) {
    const itemNameLower = item.name.toLowerCase();
    const fullNameLower = `${item.name} ${item.strength}`.toLowerCase();

    if (itemNameLower.startsWith(norm) || fullNameLower.startsWith(norm)) {
      prefixMatches.push(item);
    } else if (itemNameLower.includes(norm) || fullNameLower.includes(norm)) {
      containsMatches.push(item);
    }
  }

  const combined = [...prefixMatches, ...containsMatches];
  return combined.slice(0, maxResults);
}
