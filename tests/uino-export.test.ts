import { describe, expect, it } from "vitest";
import { generateKifExport, generateKufExport, MAX_UINO_FILE_BYTES, UinoExportError, type UinoPurchaseEntry, type UinoSalesEntry } from "../src/modules/uino-export/generator";

const company = { id: "company-a", workspaceId: "workspace-a", vatNumber: "209934990006" };
const period = { id: "period-a", companyId: "company-a", year: 2026, month: 7, status: "ready_for_export" as const };
const generatedAt = new Date("2026-07-15T10:11:12.000Z");
const partner = { name: "Žito Čaršija d.o.o.", address: "Ćirila 1, Sarajevo", vatNumber: "440000000001", jib: "4200000000001" };

const purchase = (overrides: Partial<UinoPurchaseEntry> = {}): UinoPurchaseEntry => ({
  id: "purchase-1", companyId: company.id, taxPeriodId: period.id, documentType: "01", invoiceNumber: "KUF-1",
  invoiceDate: "2026-06-30", receivedDate: "2026-07-01", partner,
  invoiceAmountExcludingVat: "100", invoiceAmountWithVat: "117.0", flatRateCompensation: 0,
  inputVatAmount: "17.00", deductibleInputVat: "17.00", nonDeductibleInputVat: "0.00",
  inputVatField32: "0.00", inputVatField33: "0.00", inputVatField34: "0.00", ...overrides,
});

const sale = (overrides: Partial<UinoSalesEntry> = {}): UinoSalesEntry => ({
  id: "sale-1", companyId: company.id, taxPeriodId: period.id, documentType: "01", invoiceNumber: "KIF-1",
  invoiceDate: "2026-07-02", partner,
  invoiceTotalAmount: "117", internalInvoiceAmount: "0", exportInvoiceAmount: "0", vatExemptSupplyAmount: "0",
  taxableBaseRegistered: "100", outputVatRegistered: "17", taxableBaseNonRegistered: "0", outputVatNonRegistered: "0",
  outputVatField32: "0", outputVatField33: "0", outputVatField34: "0", ...overrides,
});

function lines(content: string) { return content.trimEnd().split("\r\n").map((line) => line.split(";")); }

describe("UINO KUF export", () => {
  it("generates 7/20/11 records, filename and Sarajevo timestamp", () => {
    const [file] = generateKufExport({ company, period, entries: [purchase()], generatedAt });
    const records = lines(file.content);
    expect(file.fileName).toBe("209934990006_2607_1_01.csv");
    expect(records.map((record) => record.length)).toEqual([7, 20, 11]);
    expect(records[0]).toEqual(["1", "209934990006", "2607", "1", "01", "2026-07-15", "12:11:12"]);
    expect(records[1].slice(11)).toEqual(["100.00", "117.00", "0.00", "17.00", "17.00", "0.00", "0.00", "0.00", "0.00"]);
    expect(records[2]).toEqual(["3", "100.00", "117.00", "0.00", "17.00", "17.00", "0.00", "0.00", "0.00", "0.00", "1"]);
  });

  it("produces valid UTF-8 rather than legacy ANSI bytes", () => {
    const [file] = generateKufExport({ company, period, entries: [purchase()], generatedAt });
    expect(new TextDecoder("utf-8", { fatal: true }).decode(file.bytes)).toBe(file.content);
    expect(new TextDecoder().decode(file.bytes)).toContain("Žito Čaršija");
  });
});

describe("UINO KIF export", () => {
  it("generates 7/21/13 records with sums from exported entries", () => {
    const [file] = generateKifExport({ company, period, entries: [sale(), sale({ id: "sale-2", invoiceNumber: "KIF-2", invoiceTotalAmount: "2.35", taxableBaseRegistered: "2.00", outputVatRegistered: "0.35" })], generatedAt });
    const records = lines(file.content);
    expect(file.fileName).toBe("209934990006_2607_2_01.csv");
    expect(records.map((record) => record.length)).toEqual([7, 21, 21, 13]);
    expect(records[3]).toEqual(["3", "119.35", "0.00", "0.00", "0.00", "102.00", "17.35", "0.00", "0.00", "0.00", "0.00", "0.00", "2"]);
  });
});

describe("UINO export blockers", () => {
  it("rejects semicolons and missing UINO amounts", () => {
    expect(() => generateKufExport({ company, period, entries: [purchase({ partner: { ...partner, name: "Loš; naziv" } })], generatedAt })).toThrow(/separator/);
    expect(() => generateKifExport({ company, period, entries: [sale({ outputVatField34: null })], generatedAt })).toThrow(/nedostaje/);
  });

  it("rejects a period that is not ready and other validation errors", () => {
    expect(() => generateKufExport({ company, period: { ...period, status: "locked" }, entries: [purchase()], generatedAt })).toThrowError(expect.objectContaining({ code: "PERIOD_NOT_READY" }));
    expect(() => generateKifExport({ company, period, entries: [sale({ invoiceDate: "2026-08-01" })], generatedAt })).toThrow(/poreznom periodu/);
  });

  it.each(["06", "07"])("blocks document type %s until the sign policy is confirmed", (documentType) => {
    try {
      generateKufExport({ company, period, entries: [purchase({ documentType })], generatedAt });
      throw new Error("Expected export to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(UinoExportError);
      expect(error).toMatchObject({ code: "UNCONFIRMED_CORRECTION" });
    }
  });
});

describe("UINO 5 MB split", () => {
  it("splits UTF-8 output above 5 MB and numbers files sequentially", () => {
    const longPartner = { ...partner, name: "Č".repeat(100), address: "Ž".repeat(100) };
    const entries = Array.from({ length: 11_000 }, (_, index) => purchase({
      id: `purchase-${index}`, invoiceNumber: `${String(index + 1).padStart(10, "0")}-${"X".repeat(70)}`, partner: longPartner,
    }));
    const files = generateKufExport({ company, period, entries, generatedAt });
    expect(files.length).toBeGreaterThan(1);
    expect(files.map((file) => file.fileName)).toEqual(files.map((_, index) => `209934990006_2607_1_${String(index + 1).padStart(2, "0")}.csv`));
    expect(files.every((file) => file.bytes.byteLength <= MAX_UINO_FILE_BYTES)).toBe(true);
    expect(files.reduce((sum, file) => sum + file.itemCount, 0)).toBe(entries.length);
    for (const file of files) {
      const records = lines(file.content);
      expect(records.at(-1)?.at(-1)).toBe(String(file.itemCount));
    }
  });
});
