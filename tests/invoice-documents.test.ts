import { describe, expect, it, vi } from "vitest";
import { MAX_INVOICE_DOCUMENT_BYTES, validateInvoiceDocumentFile } from "../src/modules/invoice-documents/file-validation";
import { createPrivateDocumentSignedUrl } from "../src/modules/invoice-documents/signed-url";
import { validateDocumentConfirmation } from "../src/modules/invoice-documents/workflow";

const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]);
const document = { companyId: "company-a", status: "reviewing", linkedEntryId: null };
const period = { id: "period-a", companyId: "company-a", status: "open" };

describe("invoice document file validation", () => {
  it("accepts supported bytes only when declared MIME matches", () => {
    expect(validateInvoiceDocumentFile({ filename: "dummy.pdf", declaredMime: "application/pdf", bytes: pdf })).toEqual({ filename: "dummy.pdf", mimeType: "application/pdf", byteSize: 8 });
    expect(() => validateInvoiceDocumentFile({ filename: "fake.jpg", declaredMime: "image/jpeg", bytes: pdf })).toThrow("MIME");
  });

  it("rejects unsupported HEIC content and files above 15 MB", () => {
    expect(() => validateInvoiceDocumentFile({ filename: "dummy.heic", declaredMime: "image/heic", bytes: new Uint8Array([0, 1, 2]) })).toThrow("HEIC");
    expect(() => validateInvoiceDocumentFile({ filename: "large.pdf", declaredMime: "application/pdf", bytes: new Uint8Array(MAX_INVOICE_DOCUMENT_BYTES + 1) })).toThrow("15 MB");
  });
});

describe("reviewed posting workflow", () => {
  it("does not allow a foreign-company document", () => {
    expect(validateDocumentConfirmation({ document: { ...document, companyId: "company-b" }, activeCompanyId: "company-a", period, ledger: "kuf" })).toContain("Dokument ne pripada aktivnoj firmi.");
  });

  it("requires an explicit ledger and an open period before posting", () => {
    expect(validateDocumentConfirmation({ document, activeCompanyId: "company-a", period, ledger: null })).toContain("Ručno odaberite KUF ili KIF.");
    expect(validateDocumentConfirmation({ document, activeCompanyId: "company-a", period: { ...period, status: "locked" }, ledger: "kif" })).toContain("Zaključan period ne dozvoljava knjiženje.");
  });

  it("prevents double confirmation and rejected-document posting", () => {
    expect(validateDocumentConfirmation({ document: { ...document, status: "confirmed", linkedEntryId: "entry-a" }, activeCompanyId: "company-a", period, ledger: "kuf" })).toContain("Dokument je već potvrđen.");
    expect(validateDocumentConfirmation({ document: { ...document, status: "rejected" }, activeCompanyId: "company-a", period, ledger: "kuf" })).toContain("Odbačeni dokument nije moguće knjižiti.");
  });

  it("allows the explicit confirmation path for one open company period", () => {
    expect(validateDocumentConfirmation({ document, activeCompanyId: "company-a", period, ledger: "kuf" })).toEqual([]);
  });
});

describe("private signed download", () => {
  it("loads the RLS-visible path before creating a short-lived URL", async () => {
    const loadStoragePath = vi.fn().mockResolvedValue({ data: { storage_path: "company-a/random-id" }, error: null });
    const signStoragePath = vi.fn().mockResolvedValue({ data: { signedUrl: "http://local/signed" }, error: null });
    await expect(createPrivateDocumentSignedUrl({ loadStoragePath, signStoragePath }, "document-a")).resolves.toEqual({ signedUrl: "http://local/signed", expiresIn: 120 });
    expect(loadStoragePath).toHaveBeenCalledWith("document-a");
    expect(signStoragePath).toHaveBeenCalledWith("company-a/random-id", 120);
  });

  it("never signs a path when RLS hides the document", async () => {
    const signStoragePath = vi.fn();
    await expect(createPrivateDocumentSignedUrl({ loadStoragePath: vi.fn().mockResolvedValue({ data: null, error: { message: "denied" } }), signStoragePath }, "foreign-document")).rejects.toThrow("nije pronađen");
    expect(signStoragePath).not.toHaveBeenCalled();
  });
});
