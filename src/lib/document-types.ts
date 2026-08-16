export const DOCUMENT_TYPES_VERSION = "2023-01";

export const DOCUMENT_TYPES = ["01", "02", "03", "04", "05", "06", "07", "08", "09"] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const DOCUMENT_TYPE_LABELS: Record<"KUF" | "KIF", Record<DocumentType, string>> = {
  KUF: {
    "01": "Domaća faktura",
    "02": "Vlastita potrošnja",
    "03": "Avansna faktura",
    "04": "JCI za uvoz",
    "05": "Usluge primljene iz inostranstva",
    "06": "Naknadno umanjenje ili primljeni popust",
    "07": "Ispravak odbitka ulaznog PDV-a",
    "08": "Posebna šema građevinarstva",
    "09": "Ostalo",
  },
  KIF: {
    "01": "Domaća faktura",
    "02": "Vlastita potrošnja",
    "03": "Avansna faktura",
    "04": "JCI za izvoz",
    "05": "Usluge stranom licu / od stranog lica",
    "06": "Umanjenje PDV-a po PDV-SL-2",
    "07": "Manjak",
    "08": "Izvršena donacija",
    "09": "Ostalo",
  },
};

export function isDocumentType(value: string): value is DocumentType {
  return DOCUMENT_TYPES.includes(value as DocumentType);
}

export function getDocumentTypeLabel(book: "KUF" | "KIF", value: DocumentType) {
  return DOCUMENT_TYPE_LABELS[book][value];
}
