export const PURCHASE_MONEY_FIELDS = [
  "invoiceAmountExcludingVat",
  "invoiceAmountWithVat",
  "flatRateCompensation",
  "inputVatAmount",
  "deductibleInputVat",
  "nonDeductibleInputVat",
  "inputVatField32",
  "inputVatField33",
  "inputVatField34",
] as const;

export const SALES_MONEY_FIELDS = [
  "invoiceTotalAmount",
  "internalInvoiceAmount",
  "exportInvoiceAmount",
  "vatExemptSupplyAmount",
  "taxableBaseRegistered",
  "outputVatRegistered",
  "taxableBaseNonRegistered",
  "outputVatNonRegistered",
  "outputVatField32",
  "outputVatField33",
  "outputVatField34",
] as const;

export type PurchaseMoneyField = (typeof PURCHASE_MONEY_FIELDS)[number];
export type SalesMoneyField = (typeof SALES_MONEY_FIELDS)[number];
export type UinoMoneyField = PurchaseMoneyField | SalesMoneyField;

export const UINO_MONEY_FIELD_LABELS: Record<UinoMoneyField, string> = {
  invoiceAmountExcludingVat: "Iznos bez PDV-a",
  invoiceAmountWithVat: "Iznos sa PDV-om",
  flatRateCompensation: "Paušalna naknada",
  inputVatAmount: "Ulazni PDV",
  deductibleInputVat: "Odbitni ulazni PDV",
  nonDeductibleInputVat: "Neodbitni ulazni PDV",
  inputVatField32: "Ulazni PDV — polje 32",
  inputVatField33: "Ulazni PDV — polje 33",
  inputVatField34: "Ulazni PDV — polje 34",
  invoiceTotalAmount: "Ukupan iznos",
  internalInvoiceAmount: "Interna faktura",
  exportInvoiceAmount: "Izvoz",
  vatExemptSupplyAmount: "Oslobođene isporuke",
  taxableBaseRegistered: "Osnovica — registrovani kupci",
  outputVatRegistered: "Izlazni PDV — registrovani kupci",
  taxableBaseNonRegistered: "Osnovica — neregistrovani kupci",
  outputVatNonRegistered: "Izlazni PDV — neregistrovani kupci",
  outputVatField32: "Izlazni PDV — polje 32",
  outputVatField33: "Izlazni PDV — polje 33",
  outputVatField34: "Izlazni PDV — polje 34",
};

export function getMoneyFields(book: "KUF" | "KIF") {
  return book === "KUF" ? PURCHASE_MONEY_FIELDS : SALES_MONEY_FIELDS;
}
