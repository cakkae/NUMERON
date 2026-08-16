export type PurchaseInput = {
  invoiceNumber: string;
  invoiceDate: string;
  amount: string;
  partnerId: string;
};

import { isValidJib, isValidVatNumber, validateBasicEntry } from "./validation-engine";

export { isValidJib, isValidVatNumber };

export function validatePurchase(input: PurchaseInput) {
  return validateBasicEntry({ ...input, documentType: "01" });
}

export function canModifyPurchase(periodStatus: "open" | "locked") {
  return periodStatus === "open";
}
