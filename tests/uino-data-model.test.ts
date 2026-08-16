import { describe, expect, it } from "vitest";
import { DOCUMENT_TYPES, DOCUMENT_TYPE_LABELS } from "../src/lib/document-types";
import { isValidOrEmptyJib, isValidOrEmptyVatNumber, isValidUinoAmount, validateBookEntries, validateEntryForm } from "../src/lib/validation-engine";
import { emptyEntry } from "../src/types/accounting";

const period = { id: "period-a", companyId: "company-a", year: 2026, month: 8 };
const baseEntry = {
  id: "entry-a", companyId: "company-a", taxPeriodId: "period-a", partnerId: "partner-a",
  documentType: "01", invoiceNumber: "DOC-1", invoiceDate: "2026-07-31", receivedDate: "2026-08-02",
};

describe("UINO identifiers", () => {
  it("allows empty identifiers for a non-obligor", () => {
    expect(isValidOrEmptyVatNumber(null)).toBe(true);
    expect(isValidOrEmptyVatNumber("")).toBe(true);
    expect(isValidOrEmptyJib(null)).toBe(true);
    expect(isValidOrEmptyJib("")).toBe(true);
    expect(validateBookEntries({ book: "KUF", activeCompanyId: "company-a", period, partners: [{ id: "partner-a", vatNumber: null, jib: null }], entries: [baseEntry] })).toEqual([]);
  });

  it("requires UINO zero identifiers for import and export", () => {
    const importEntry = { ...baseEntry, documentType: "04" };
    const errors = validateBookEntries({ book: "KUF", activeCompanyId: "company-a", period, partners: [{ id: "partner-a", vatNumber: null, jib: null }], entries: [importEntry] });
    expect(errors.map((error) => error.code)).toEqual(expect.arrayContaining(["VAT_NUMBER", "JIB"]));
    expect(validateBookEntries({ book: "KUF", activeCompanyId: "company-a", period, partners: [{ id: "partner-a", vatNumber: "000000000000", jib: "0000000000000" }], entries: [importEntry] })).toEqual([]);
  });
});

describe("UINO monetary fields", () => {
  it("accepts blanks and valid values without calculating VAT", () => {
    const form = { ...emptyEntry(), partnerId: "partner-a", invoiceNumber: "KUF-1", invoiceDate: "2026-07-31", receivedDate: "2026-08-01", invoiceAmountExcludingVat: "100.00", inputVatAmount: "17.00" };
    expect(validateEntryForm("KUF", form)).toEqual([]);
    expect(form.invoiceAmountWithVat).toBe("");
  });

  it("rejects negative values, too many decimals and values wider than UINO format", () => {
    expect(isValidUinoAmount("-1.00")).toBe(false);
    expect(isValidUinoAmount("1.001")).toBe(false);
    expect(isValidUinoAmount("12345678901234567890123.00")).toBe(false);
    const form = { ...emptyEntry(), partnerId: "partner-a", invoiceNumber: "KIF-1", invoiceDate: "2026-08-01", invoiceTotalAmount: "1.001" };
    expect(validateEntryForm("KIF", form)).toContain("UINO iznosi moraju biti nula ili pozitivni brojevi sa najviše dvije decimale.");
  });

  it("validates KUF period by receipt date", () => {
    const errors = validateBookEntries({ book: "KUF", activeCompanyId: "company-a", period, partners: [{ id: "partner-a", vatNumber: null, jib: null }], entries: [{ ...baseEntry, receivedDate: "2026-09-01" }] });
    expect(errors).toContainEqual(expect.objectContaining({ code: "PERIOD", book: "KUF" }));
  });
});

describe("UINO document types", () => {
  it("has book-specific official labels for all types 01 through 09", () => {
    for (const type of DOCUMENT_TYPES) {
      expect(DOCUMENT_TYPE_LABELS.KUF[type]).toBeTruthy();
      expect(DOCUMENT_TYPE_LABELS.KIF[type]).toBeTruthy();
    }
    expect(DOCUMENT_TYPE_LABELS.KUF["08"]).toContain("građevinarstva");
    expect(DOCUMENT_TYPE_LABELS.KIF["08"]).toContain("donacija");
  });
});
