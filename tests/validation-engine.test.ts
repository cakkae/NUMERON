import { describe, expect, it } from "vitest";
import { DOCUMENT_TYPES, DOCUMENT_TYPES_VERSION, isDocumentType } from "../src/lib/document-types";
import { getPeriodValidationStatus, validateBookEntries } from "../src/lib/validation-engine";

const period = { id: "period-a", companyId: "company-a", year: 2026, month: 8 };
const partners = [{ id: "partner-a", vatNumber: "440000000001", jib: "4200000000001" }];
const validEntry = { id: "entry-a", companyId: "company-a", taxPeriodId: "period-a", partnerId: "partner-a", documentType: "01", invoiceNumber: "IF-1", invoiceDate: "2026-08-15", amount: 100 };

describe("document type configuration", () => {
  it("contains the versioned document types 01 through 09", () => {
    expect(DOCUMENT_TYPES_VERSION).toBe("2023-01");
    expect(DOCUMENT_TYPES).toEqual(["01", "02", "03", "04", "05", "06", "07", "08", "09"]);
    for (const type of DOCUMENT_TYPES) expect(isDocumentType(type)).toBe(true);
    expect(isDocumentType("10")).toBe(false);
  });
});

describe("shared KUF/KIF validation", () => {
  it("accepts a valid KIF entry", () => {
    expect(validateBookEntries({ book: "KIF", activeCompanyId: "company-a", period, partners, entries: [validEntry] })).toEqual([]);
  });

  it("finds shared blocking errors and duplicates", () => {
    const invalid = { ...validEntry, documentType: "10", invoiceDate: "2026-09-01", amount: -1 };
    const errors = validateBookEntries({ book: "KUF", activeCompanyId: "company-a", period, partners, entries: [invalid, { ...invalid, id: "entry-b" }] });
    expect(errors.map((error) => error.code)).toEqual(expect.arrayContaining(["PERIOD", "AMOUNT", "DOCUMENT_TYPE", "DUPLICATE"]));
    expect(getPeriodValidationStatus(errors, []).readyForExport).toBe(false);
  });

  it("isolates entries from another company", () => {
    const errors = validateBookEntries({ book: "KIF", activeCompanyId: "company-a", period, partners, entries: [{ ...validEntry, companyId: "company-b" }] });
    expect(errors).toContainEqual(expect.objectContaining({ code: "COMPANY_ACCESS", book: "KIF" }));
  });

  it("marks a period ready only without blocking errors", () => {
    expect(getPeriodValidationStatus([], [])).toEqual({ errorCount: 0, readyForExport: true, errors: [] });
  });
});
