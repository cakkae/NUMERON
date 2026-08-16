export const MAX_INVOICE_DOCUMENT_BYTES = 15_000_000;
export const INVOICE_DOCUMENT_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"] as const;
export type InvoiceDocumentMime = typeof INVOICE_DOCUMENT_MIME_TYPES[number];

export class InvoiceFileValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvoiceFileValidationError";
  }
}

function hasPrefix(bytes: Uint8Array, signature: number[]) {
  return signature.every((value, index) => bytes[index] === value);
}

export function detectInvoiceDocumentMime(bytes: Uint8Array): InvoiceDocumentMime | null {
  if (hasPrefix(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) return "application/pdf";
  if (hasPrefix(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (hasPrefix(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (bytes.length >= 12 && hasPrefix(bytes, [0x52, 0x49, 0x46, 0x46]) && hasPrefix(bytes.slice(8), [0x57, 0x45, 0x42, 0x50])) return "image/webp";
  return null;
}

export function validateInvoiceDocumentFile(input: { filename: string; declaredMime: string; bytes: Uint8Array }) {
  const filename = input.filename.trim();
  if (!filename || filename.length > 255) throw new InvoiceFileValidationError("Naziv fajla mora sadržavati između 1 i 255 znakova.");
  if (input.bytes.byteLength === 0) throw new InvoiceFileValidationError("Fajl je prazan.");
  if (input.bytes.byteLength > MAX_INVOICE_DOCUMENT_BYTES) throw new InvoiceFileValidationError("Fajl je veći od dozvoljenih 15 MB.");
  const detectedMime = detectInvoiceDocumentMime(input.bytes);
  if (!detectedMime) throw new InvoiceFileValidationError("Format nije podržan. Odaberite PDF, JPEG, PNG ili WebP; HEIC i OCR nisu dio ove faze.");
  if (input.declaredMime !== detectedMime) throw new InvoiceFileValidationError("Sadržaj fajla ne odgovara prijavljenom MIME tipu.");
  return { filename, mimeType: detectedMime, byteSize: input.bytes.byteLength };
}
