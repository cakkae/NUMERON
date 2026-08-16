export type PurchaseInput = {
  invoiceNumber: string;
  invoiceDate: string;
  amount: string;
  partnerId: string;
};

export function isValidVatNumber(value: string) {
  return /^\d{12}$/.test(value);
}

export function isValidJib(value: string) {
  return /^\d{13}$/.test(value);
}

export function validatePurchase(input: PurchaseInput) {
  const errors: string[] = [];
  const invoiceDate = new Date(`${input.invoiceDate}T00:00:00.000Z`);
  if (!input.partnerId) errors.push("Odaberite partnera.");
  if (!input.invoiceNumber.trim()) errors.push("Broj fakture je obavezan.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.invoiceDate) || Number.isNaN(invoiceDate.getTime()) || invoiceDate.toISOString().slice(0, 10) !== input.invoiceDate) errors.push("Datum fakture nije ispravan.");
  if (!input.amount || Number.isNaN(Number(input.amount)) || Number(input.amount) < 0) errors.push("Iznos mora biti nula ili pozitivan broj.");
  return errors;
}

export function canModifyPurchase(periodStatus: "open" | "locked") {
  return periodStatus === "open";
}
