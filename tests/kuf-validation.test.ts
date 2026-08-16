import { describe, expect, it } from "vitest";
import { canModifyPurchase, isValidJib, isValidVatNumber, validatePurchase } from "../src/lib/kuf-validation";

describe("KUF validation", () => {
  it("validates partner identifiers", () => {
    expect(isValidVatNumber("440000000001")).toBe(true);
    expect(isValidVatNumber("44000000001")).toBe(false);
    expect(isValidJib("4200000000001")).toBe(true);
    expect(isValidJib("420000000001")).toBe(false);
  });

  it("rejects invalid purchase data", () => {
    expect(validatePurchase({ partnerId: "", invoiceNumber: "", invoiceDate: "2026-14-40", amount: "-1" })).toHaveLength(4);
    expect(validatePurchase({ partnerId: "partner-a", invoiceNumber: "INV-1", invoiceDate: "2026-02-31", amount: "0" })).toContain("Datum fakture nije ispravan.");
  });

  it("does not allow changes after a period is locked", () => {
    expect(canModifyPurchase("open")).toBe(true);
    expect(canModifyPurchase("locked")).toBe(false);
  });
});
