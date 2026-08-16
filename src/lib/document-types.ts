export const DOCUMENT_TYPES_VERSION = "2023-01";

export const DOCUMENT_TYPES = ["01", "02", "03", "04", "05", "06", "07", "08", "09"] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export function isDocumentType(value: string): value is DocumentType {
  return DOCUMENT_TYPES.includes(value as DocumentType);
}
